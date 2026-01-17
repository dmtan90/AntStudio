
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProjectStore = defineStore('project', () => {
    // State
    const currentProject = ref<any>(null)
    const isProcessing = ref(false)
    const isGenerating = ref(false)

    // Getters
    const projectId = computed(() => currentProject.value?._id)
    const visualAssets = computed(() => currentProject.value?.visualAssets || [])
    const characters = computed(() => currentProject.value?.scriptAnalysis?.characters || [])
    const segments = computed(() => currentProject.value?.storyboard?.segments || [])
    const scriptAnalysis = computed(() => currentProject.value?.scriptAnalysis)

    // Actions
    async function fetchProject(id: string) {
        if (!id) return
        isProcessing.value = true
        try {
            const token = localStorage.getItem('auth-token')
            const response = await $fetch(`/api/projects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response?.data?.project) {
                currentProject.value = response.data.project
            }
        } catch (error) {
            console.error('Failed to fetch project:', error)
            throw error
        } finally {
            isProcessing.value = false
        }
    }

    async function updateProject(updateData: any) {
        if (!projectId.value) return
        try {
            // Optimistic update
            Object.assign(currentProject.value, updateData)

            // Persist to Backend
            const token = localStorage.getItem('auth-token')
            await $fetch(`/api/projects/${projectId.value}`, {
                method: 'PUT',
                body: updateData,
                headers: { Authorization: `Bearer ${token}` }
            })
        } catch (error) {
            console.error('Failed to update project:', error)
        }
    }

    // Set project data directly (e.g. after a save response)
    function setProject(data: any) {
        currentProject.value = data
    }

    // Asset Management
    async function updateVisualAssetStatus(assetName: string, status: string, data?: any) {
        if (!currentProject.value?.visualAssets) return

        // 1. Update project visual assets list
        const asset = currentProject.value.visualAssets.find((a: any) => a.name === assetName)
        if (asset) {
            asset.status = status
            if (data?.s3Key) asset.s3Key = data.s3Key
            if (data?.url) asset.url = data.url
        }

        // 2. Sync status to Chat History (to prevent re-generation on reload)
        if (currentProject.value?.chatHistory) {
            // Find ALL visual-assets messages and update the one containing this asset
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

        // 3. Persist to Backend
        await updateProject({
            visualAssets: currentProject.value.visualAssets,
            chatHistory: currentProject.value.chatHistory,
            scriptAnalysis: currentProject.value.scriptAnalysis, // Keep elements synced too
            storyboard: currentProject.value.storyboard // Keep storyboard images synced
        })
    }

    function syncAllAssets() {
        if (!visualAssets.value || visualAssets.value.length === 0) return
        console.log('[Store] Syncing all assets...')
        visualAssets.value.forEach((asset: any) => {
            if (asset.s3Key && asset.name) {
                syncAssetToElements(asset.name, asset.s3Key)
            }
        })
    }

    // Smart Sync Helper (Client Side Update) - Ensures UI updates immediately while backend also does it
    function syncAssetToElements(assetName: string, s3Key: string) {
        try {
            // Clean Asset Name
            if (!assetName) return

            const cleanName = assetName
                .replace(/^Element_/i, '')
                .replace(/\.[^/.]+$/, "")
                .replace(/_/g, ' ')
                .replace(/-/g, ' ')

            const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

            // Generate Tokens: Split by space, camelCase
            const tokens = cleanName
                .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
                .split(/\s+/)
                .map(normalize)
                .filter(t => t && t.length > 2)

            const assetFullNameNorm = normalize(cleanName)

            console.log(`[Store] Syncing ${assetName} (Norm: ${assetFullNameNorm}) Tokens: [${tokens.join(', ')}]`)

            // Sync Characters
            characters.value.forEach((char: any) => {
                try {
                    const charName = char.name
                    const charNameNorm = normalize(charName)

                    if (!charNameNorm) return

                    // 1. Direct Containment
                    if (assetFullNameNorm.includes(charNameNorm) || charNameNorm.includes(assetFullNameNorm)) {
                        char.referenceImage = s3Key
                        console.log(`[Store] MATCH (Full): ${char.name}`)
                        return
                    }

                    // 2. Token Matching
                    const isTokenMatch = tokens.some(token => charNameNorm.includes(token))

                    // 3. Reverse Token Matching (Parentheses priority)
                    let isSpecialMatch = false
                    if (charName.includes('(')) {
                        const parenthesized = charName.match(/\((.*?)\)/)
                        const specialKey = parenthesized ? normalize(parenthesized[1]) : null
                        if (specialKey && (assetFullNameNorm.includes(specialKey) || tokens.includes(specialKey))) {
                            isSpecialMatch = true
                        }
                    }

                    if (isTokenMatch || isSpecialMatch) {
                        char.referenceImage = s3Key
                        console.log(`[Store] MATCH (Token/Special): ${char.name}`)
                    }
                } catch (err) {
                    console.error('[Store] Error syncing char:', err)
                }
            })

            // Sync Segments
            segments.value.forEach((seg: any) => {
                try {
                    const segOrder = seg.order.toString()
                    const segTokens = [`segment${segOrder}`, `scene${segOrder}`, `frame${segOrder}`]

                    const isSegMatch = segTokens.some(t => assetFullNameNorm.includes(t))

                    const hasSceneKey = assetFullNameNorm.includes('scene') || assetFullNameNorm.includes('segment')
                    const hasNumber = assetFullNameNorm.includes(segOrder) || tokens.includes(segOrder)

                    if (isSegMatch || (hasSceneKey && hasNumber)) {
                        if (!assetName.match(/\.(mp4|mov|webm)$/i)) {
                            seg.sceneImage = s3Key
                            console.log(`[Store] MATCH Segment ${seg.order} (Image)`)
                        }
                    }
                } catch (err) {
                    console.error('[Store] Error syncing seg:', err)
                }
            })
        } catch (error) {
            console.error('[Store] Critical Error in syncAssetToElements:', error)
        }
    }

    return {
        currentProject,
        isProcessing,
        isGenerating,
        projectId,
        visualAssets,
        characters,
        segments,
        scriptAnalysis,
        fetchProject,
        updateProject,
        setProject,
        updateVisualAssetStatus,
        syncAssetToElements,
        syncAllAssets
    }
})
