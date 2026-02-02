import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

export const useProjectStore = defineStore('project', () => {
    const { t } = useTranslations()

    // State
    const projects = ref<any[]>([])
    const currentProject = ref<any>(null)
    const pagination = ref({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    })
    const isProcessing = ref(false)
    const isGenerating = ref(false)
    const loadingList = ref(false)
    const editorMode = ref<'simple' | 'studio'>('simple')

    // Getters
    const projectId = computed(() => currentProject.value?._id)
    const visualAssets = computed(() => currentProject.value?.visualAssets || [])
    const characters = computed(() => currentProject.value?.scriptAnalysis?.characters || [])
    const segments = computed(() => currentProject.value?.storyboard?.segments || [])
    const scriptAnalysis = computed(() => currentProject.value?.scriptAnalysis)

    // Helper
    function handleError(error: any, defaultKey: string = 'common.failed') {
        const message = error.response?.data?.error || error.message || t(defaultKey)
        toast.error(t(message))
        return message
    }

    // Actions
    async function fetchProjects(page = 1, limit = 20) {
        loadingList.value = true
        try {
            const response = await api.get('/projects', {
                params: { page, limit }
            })
            projects.value = response.data.projects || []
            pagination.value = response.data.pagination || pagination.value
            return response.data
        } catch (error) {
            handleError(error, 'projects.loadFailed')
            throw error
        } finally {
            loadingList.value = false
        }
    }

    async function fetchProject(id: string) {
        if (!id) return
        isProcessing.value = true
        try {
            const response = await api.get(`/projects/${id}`)
            currentProject.value = response.data.project
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            isProcessing.value = false
        }
    }

    async function createProject(projectData: any) {
        isProcessing.value = true
        try {
            const response = await api.post('/projects', projectData)
            const newProject = response.data.project
            if (newProject) {
                projects.value.unshift(newProject)
            }
            toast.success(t('projects.new.success'))
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            isProcessing.value = false
        }
    }

    async function updateProject(updateData: any, id?: string) {
        const idToUse = id || projectId.value
        if (!idToUse) return
        try {
            // Optimistic update if it's the current project
            if (currentProject.value && currentProject.value._id === idToUse) {
                Object.assign(currentProject.value, updateData)
            }

            // Persist to Backend
            const response = await api.put(`/projects/${idToUse}`, updateData)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function deleteProject(id: string) {
        try {
            await api.delete(`/projects/${id}`)
            projects.value = projects.value.filter(p => p._id !== id)
            if (currentProject.value?._id === id) {
                currentProject.value = null
            }
            toast.success(t('projects.deleteSuccess'))
        } catch (error) {
            handleError(error, 'projects.deleteFailed')
            throw error
        }
    }

    async function getPreview(inputData: any, projectId?: string) {
        isGenerating.value = true
        try {
            const url = projectId ? `/projects/${projectId}/preview` : '/projects/preview'
            const response = await api.post(url, inputData)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            isGenerating.value = false
        }
    }

    async function analyzeProduct(inputData: any) {
        isGenerating.value = true
        try {
            const response = await api.post('/ai/analyze-product', inputData, {
                headers: {
                    'Content-Type': inputData instanceof FormData ? 'multipart/form-data' : 'application/json'
                }
            })
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            isGenerating.value = false
        }
    }

    async function chat(id: string, message: string) {
        try {
            const response = await api.post(`/projects/${id}/chat`, { message })
            if (currentProject.value) {
                if (!currentProject.value.chatHistory) currentProject.value.chatHistory = []
                currentProject.value.chatHistory.push({
                    author: 'ai',
                    content: response.data.response, // Backend returns { response: string }
                    type: 'text',
                    timestamp: new Date()
                })
            }
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateVisualPlan(id: string) {
        try {
            const response = await api.post(`/projects/${id}/generate-visual-plan`)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateStoryboardAssetsBatch(id: string) {
        try {
            const response = await api.post(`/projects/${id}/storyboard/generate-assets`)
            toast.success(t('projects.editor.storyboard.batchStartSuccess') || 'Batch generation started')
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateAsset(id: string, assetData: any) {
        try {
            const response = await api.post(`/projects/${id}/assets/generate`, assetData)
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function getAssetStatus(id: string, jobId: string) {
        try {
            const response = await api.get(`/projects/${id}/assets/status/${jobId}`)
            return response.data
        } catch (error) {
            // Silently fail or minimal log for polling
            return { success: false, error: error.message }
        }
    }

    async function assembleVideo(id: string) {
        try {
            const response = await api.post(`/projects/${id}/assemble-video`)
            if (response.data.data.finalVideo && currentProject.value) {
                currentProject.value.finalVideo = response.data.data.finalVideo
                currentProject.value.status = 'completed'
            }
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    // Set project data directly
    function setProject(data: any) {
        currentProject.value = data
    }

    // Asset Management
    async function updateVisualAssetStatus(assetName: string, status: string, data?: any) {
        if (!currentProject.value?.visualAssets) return

        const asset = currentProject.value.visualAssets.find((a: any) => a.name === assetName)
        if (asset) {
            asset.status = status
            if (data?.s3Key) asset.s3Key = data.s3Key
            if (data?.url) asset.url = data.url
        }

        if (currentProject.value?.chatHistory) {
            currentProject.value.chatHistory.forEach((msg: any) => {
                if (msg.type === 'visual-assets' && msg.result?.assets) {
                    const msgAsset = msg.result.assets.find((a: any) => a.name === assetName)
                    if (msgAsset) {
                        msgAsset.status = status
                        if (data?.s3Key) msgAsset.s3Key = data.s3Key
                    }
                }
            })
        }

        await updateProject({
            visualAssets: currentProject.value.visualAssets,
            chatHistory: currentProject.value.chatHistory,
            scriptAnalysis: currentProject.value.scriptAnalysis,
            storyboard: currentProject.value.storyboard
        })
    }

    function syncAllAssets() {
        if (!visualAssets.value || visualAssets.value.length === 0) return
        visualAssets.value.forEach((asset: any) => {
            if (asset.s3Key && asset.name) {
                syncAssetToElements(asset.name, asset.s3Key)
            }
        })
    }

    function syncAssetToElements(assetName: string, s3Key: string) {
        // try {
        //     if (!assetName) return
        //     const cleanName = assetName.replace(/^Element_/i, '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/-/g, ' ')
        //     const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        //     const tokens = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/).map(normalize).filter(t => t && t.length > 2)
        //     const assetFullNameNorm = normalize(cleanName)

        //     characters.value.forEach((char: any) => {
        //         const charNameNorm = normalize(char.name)
        //         if (!charNameNorm) return
        //         if (assetFullNameNorm.includes(charNameNorm) || charNameNorm.includes(assetFullNameNorm)) {
        //             char.referenceImage = s3Key
        //             return
        //         }
        //         const isTokenMatch = tokens.some(token => charNameNorm.includes(token))
        //         if (isTokenMatch) char.referenceImage = s3Key
        //     })

        //     segments.value.forEach((seg: any) => {
        //         const segOrder = seg.order.toString()
        //         const segTokens = [`segment${segOrder}`, `scene${segOrder}`, `frame${segOrder}`]
        //         const isSegMatch = segTokens.some(t => assetFullNameNorm.includes(t))
        //         const hasSceneKey = assetFullNameNorm.includes('scene') || assetFullNameNorm.includes('segment')
        //         const hasNumber = assetFullNameNorm.includes(segOrder) || tokens.includes(segOrder)
        //         if (isSegMatch || (hasSceneKey && hasNumber)) {
        //             if (!assetName.match(/\.(mp4|mov|webm)$/i)) seg.sceneImage = s3Key
        //         }
        //     })
        // } catch (error) {
        //     console.error('[Store] syncAssetToElements error:', error)
        // }
    }

    async function uploadAsset(id: string, file: File, entityType: 'character' | 'segment', entityId: string) {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('entityType', entityType)
            formData.append('entityId', entityId)

            const response = await api.post(`/projects/${id}/assets/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            // Refresh project to get updated data
            await fetchProject(id)

            toast.success(t('projects.editor.uploadSuccess'))
            return response.data
        } catch (error) {
            handleError(error, 'projects.editor.uploadFailed')
            throw error
        }
    }

    async function generateVoiceover(id: string, segmentId: string, options: any) {
        try {
            const response = await api.post(`/projects/${id}/segments/${segmentId}/generate-voiceover`, options)
            // Update local segment
            if (currentProject.value?.storyboard?.segments) {
                const segment = currentProject.value.storyboard.segments.find((s: any) => s._id === segmentId)
                if (segment) {
                    segment.generatedAudio = response.data.data.generatedAudio
                }
            }
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateCaptions(id: string, segmentId: string) {
        try {
            const response = await api.post(`/projects/${id}/segments/${segmentId}/captions`)
            // Update local segment
            if (currentProject.value?.storyboard?.segments) {
                const segment = currentProject.value.storyboard.segments.find((s: any) => s._id === segmentId)
                if (segment) {
                    segment.captions = response.data.data.captions
                }
            }
            return response.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function startStreaming(id: string, streamId: string) {
        try {
            const response = await api.post(`/projects/${id}/stream`, { streamId })
            return response.data
        } catch (error) {
            throw error
        }
    }

    async function addStreamEndpoint(id: string, streamId: string, rtmpUrl: string) {
        try {
            const response = await api.post(`/projects/${id}/stream/endpoint`, { streamId, rtmpUrl })
            return response.data
        } catch (error) {
            throw error
        }
    }

    async function uploadFinalVideo(id: string, formData: FormData, onProgress?: (percent: number) => void) {
        try {
            const response = await api.post(`/projects/${id}/upload-final-video`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        onProgress(percentCompleted);
                    }
                }
            })
            return response.data
        } catch (error) {
            handleError(error, 'projects.editor.uploadFailed')
            throw error
        }
    }

    async function saveToVoD(id: string) {
        try {
            const response = await api.post(`/projects/${id}/vod`)
            return response.data
        } catch (error) {
            throw error
        }
    }

    async function uploadMedia(formData: FormData) {
        try {
            const response = await api.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            return response.data
        } catch (error) {
            handleError(error, 'projects.editor.uploadFailed')
            throw error
        }
    }

    return {
        projects,
        currentProject,
        pagination,
        isProcessing,
        isGenerating,
        loadingList,
        projectId,
        visualAssets,
        characters,
        segments,
        scriptAnalysis,
        fetchProjects,
        fetchProject,
        createProject,
        updateProject,
        deleteProject,
        getPreview,
        analyzeProduct,
        chat,
        generateVisualPlan,
        generateAsset,
        getAssetStatus,
        uploadAsset,
        generateVoiceover,
        generateCaptions,
        assembleVideo,
        setProject,
        updateVisualAssetStatus,
        syncAssetToElements,
        syncAllAssets,
        generateStoryboardAssetsBatch,
        editorMode,
        startStreaming,
        addStreamEndpoint,
        saveToVoD,
        uploadMedia,
        uploadFinalVideo
    }
})
