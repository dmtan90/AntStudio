import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api.js'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
const GENERATE_ASSET_TIMEOUT = 10 * 60 * 1000; // 10 minutes

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
    async function fetchProjects(params: any = {}) {
        loadingList.value = true
        try {
            const res : any = await api.get('/projects', {
                params: {
                    page: pagination.value.page,
                    limit: pagination.value.limit,
                    ...params
                }
            })
            projects.value = res.data?.projects || []
            pagination.value = res.data?.pagination || pagination.value
            return res.data
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
            const res : any = await api.get(`/projects/${id}`)
            currentProject.value = res.data.project
            return res.data
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
            const res : any = await api.post('/projects', projectData)
            const newProject = res.data.project
            if (newProject) {
                projects.value.unshift(newProject)
            }
            toast.success(t('projects.new.success'))
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            isProcessing.value = false
        }
    }

    async function createFromMoment(moment: any) {
        isProcessing.value = true
        try {
            // Create a vertical 9:16 template for the viral moment
            const width = 1080
            const height = 1920
            const duration = 15000 // 15s default for highlights

            const pageData = {
                scene: JSON.stringify({
                    version: "5.3.0",
                    objects: [
                        {
                            type: "video",
                            originX: "center",
                            originY: "center",
                            left: width / 2,
                            top: height / 2,
                            width: width,
                            height: height,
                            src: moment.s3Key,
                            id: `video_${moment.id}`,
                            meta: {
                                duration: duration,
                                offset: 0,
                                name: 'Moment Capture'
                            }
                        }
                    ]
                }),
                audios: [],
                width,
                height,
                fill: "#000000"
            }

            const template = {
                id: null,
                name: `Draft: ${moment.reason || 'Viral Moment'}`,
                description: 'Imported from Live Studio',
                pages: [
                    {
                        id: `page_${moment.id}`,
                        name: 'Scene 1',
                        duration: duration,
                        data: pageData
                    }
                ]
            }

            const res : any = await api.post('/projects', {
                title: `Draft: ${moment.reason || 'Viral Moment'}`,
                mode: 'template',
                aspectRatio: '9:16',
                pages: template.pages,
                status: 'editing'
            })

            const newProject = res.data.project
            if (newProject) {
                projects.value.unshift(newProject)
            }
            
            toast.success(t('projects.momentImported') || 'Moment imported to Editor!')
            return newProject
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
            const res : any = await api.put(`/projects/${idToUse}`, updateData)
            return res.data
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
            const url = projectId ? `/projects/${projectId}/analysis` : '/projects/preview'
            const res : any = await api.post(url, inputData)
            return res.data
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
            const res : any = await api.post('/ai/analyze-product', inputData, {
                headers: {
                    'Content-Type': inputData instanceof FormData ? 'multipart/form-data' : 'application/json'
                }
            })
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        } finally {
            isGenerating.value = false
        }
    }

    async function chat(id: string, message: string) {
        try {
            const res : any = await api.post(`/projects/${id}/chat`, { message })
            if (currentProject.value) {
                if (!currentProject.value.chatHistory) currentProject.value.chatHistory = []
                currentProject.value.chatHistory.push({
                    author: 'ai',
                    content: res.data.response,
                    type: 'text',
                    timestamp: new Date()
                })
            }
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateVisualPlan(id: string) {
        try {
            const res : any = await api.post(`/projects/${id}/generate-visual-plan`)
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateStoryboardAssetsBatch(id: string) {
        try {
            const res : any = await api.post(`/projects/${id}/storyboard/generate-assets`, {}, {
                timeout: GENERATE_ASSET_TIMEOUT
            });
            toast.success(t('projects.editor.storyboard.batchStartSuccess') || 'Batch generation started')
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateMusic(id: string, options: any = {}) {
        try {
            isGenerating.value = true;
            const res: any = await api.post(`/projects/${id}/assets/generate`, {
                type: 'music',
                ...options
            }, {
                timeout: GENERATE_ASSET_TIMEOUT
            });
            
            // Re-fetch project to get updated musics
            await fetchProject(id);
            
            toast.success(t('projects.editor.music.generated') || 'Background music generated');
            return res.data;
        } catch (error) {
            handleError(error);
            throw error;
        } finally {
            isGenerating.value = false;
        }
    }

    async function generateAsset(id: string, assetData: any) {
        try {
            const res : any = await api.post(`/projects/${id}/assets/generate`, assetData, {
                timeout: GENERATE_ASSET_TIMEOUT
            })
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function getAssetStatus(id: string, jobId: string) {
        try {
            const res : any = await api.get(`/projects/${id}/assets/status/${jobId}`)
            return res.data
        } catch (error) {
            // Silently fail or minimal log for polling
            return { success: false, error: error.message }
        }
    }

    // async function assembleVideo(id: string) {
    //     try {
    //         const res : any = await api.post(`/projects/${id}/assemble-video`)
    //         if (res.data?.publish && currentProject.value) {
    //             currentProject.value.publish = res.data.publish
    //             currentProject.value.status = 'completed'
    //         }
    //         return res.data
    //     } catch (error) {
    //         handleError(error)
    //         throw error
    //     }
    // }

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

            const res : any = await api.post(`/projects/${id}/assets/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: GENERATE_ASSET_TIMEOUT
            })

            // Refresh project to get updated data
            await fetchProject(id)

            toast.success(t('projects.editor.uploadSuccess'))
            return res.data
        } catch (error) {
            handleError(error, 'projects.editor.uploadFailed')
            throw error
        }
    }

    async function generateVoiceover(id: string, segmentId: string, options: any) {
        try {
            const res : any = await api.post(`/projects/${id}/segments/${segmentId}/generate-voiceover`, options)
            // Update local segment
            if (currentProject.value?.storyboard?.segments) {
                const segment = currentProject.value.storyboard.segments.find((s: any) => s._id === segmentId || s.order?.toString() === segmentId?.toString())
                if (segment) {
                    segment.generatedAudio = res.data.generatedAudio
                }
            }
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function generateCaptions(id: string, segmentId: string) {
        try {
            const res : any = await api.post(`/projects/${id}/segments/${segmentId}/captions`)
            // Update local segment
            if (currentProject.value?.storyboard?.segments) {
                const segment = currentProject.value.storyboard.segments.find((s: any) => s._id === segmentId || s.order?.toString() === segmentId?.toString())
                if (segment) {
                    segment.captions = res.data.captions
                }
            }
            return res.data
        } catch (error) {
            handleError(error)
            throw error
        }
    }

    async function startStreaming(id: string, streamId: string) {
        try {
            const res : any = await api.post(`/projects/${id}/stream`, { streamId })
            return res.data
        } catch (error) {
            throw error
        }
    }

    async function addStreamEndpoint(id: string, streamId: string, rtmpUrl: string) {
        try {
            const res : any = await api.post(`/projects/${id}/stream/endpoint`, { streamId, rtmpUrl })
            return res.data
        } catch (error) {
            throw error
        }
    }

    async function publishProject(id: string, formData: FormData, onProgress?: (percent: number) => void) {
        try {
            const res : any = await api.post(`/projects/${id}/publish`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        onProgress(percentCompleted);
                    }
                }
            })
            return res.data
        } catch (error) {
            handleError(error, 'projects.editor.uploadFailed')
            throw error
        }
    }

    async function saveToVoD(id: string) {
        try {
            const res : any = await api.post(`/projects/${id}/vod`)
            return res.data
        } catch (error) {
            throw error
        }
    }

    async function uploadMedia(formData: FormData) {
        try {
            const res : any = await api.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            return res.data
        } catch (error) {
            handleError(error, 'projects.editor.uploadFailed')
            throw error
        }
    }

    async function trackEngagement(id: string, type: 'like' | 'dislike') {
        try {
            await api.post(`/projects/${id}/track`, { type })
        } catch (error) {
            console.error('Failed to track engagement', error)
        }
    }

    async function generatePrompts(id: string, type: 'segment' | 'character', payload: any) {
        try {
            const res: any = await api.post(`/prompts/generate`, { type, payload })
            return res.data
        } catch (error) {
            handleError(error)
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
        createFromMoment,
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
        // assembleVideo,
        setProject,
        updateVisualAssetStatus,
        syncAssetToElements,
        syncAllAssets,
        generateStoryboardAssetsBatch,
        generateMusic,
        editorMode,
        startStreaming,
        addStreamEndpoint,
        saveToVoD,
        uploadMedia,
        publishProject,
        trackEngagement,
        generatePrompts
    }
})
