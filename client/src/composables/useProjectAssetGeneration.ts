import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'
import { useI18n } from 'vue-i18n';

export function useProjectAssetGeneration(projectId: string) {
    const projectStore = useProjectStore()
    const { t } = useI18n()
    const generatingStates = ref<Record<string, boolean>>({})

    const pollAssetStatus = async (jobId: string, loadingKey: string) => {
        if (!jobId) return

        const check = async () => {
            try {
                const res = await projectStore.getAssetStatus(projectId, jobId)
                if (res.data?.status === 'completed') {
                    await projectStore.fetchProject(projectId)
                    generatingStates.value[loadingKey] = false
                    toast.success(t('projects.editor.storyboard.assetReady'))
                    return true
                } else if (res.data?.status === 'failed') {
                    generatingStates.value[loadingKey] = false
                    toast.error(res.data?.error || t('common.failed'))
                    return true
                }
                return false
            } catch (e) {
                console.error('[Polling] Error:', e)
                return false
            }
        }

        const isDone = await check()
        if (isDone) return

        const interval = setInterval(async () => {
            const done = await check()
            if (done) clearInterval(interval)
        }, 5000)
    }

    const handleRegenerateCharacter = async (char: any, index: number) => {
        const id = `char-${index}`
        generatingStates.value[id] = true
        try {
            const res = await projectStore.generateAsset(projectId, {
                assetName: `Element_${char.name}.img`,
                description: char.description,
                type: 'image',
                characterNames: [char.name],
                charIndex: index,
                charId: char.char_id,
                generationType: 'character'
            })

            const data = res.data || res
            const jobId = data.jobId || data.video?.veoJobId

            if (data.s3Key) {
                char.referenceImage = data.s3Key
                projectStore.syncAssetToElements(`Element_${char.name}.img`, data.s3Key)
                await projectStore.fetchProject(projectId)
                generatingStates.value[id] = false
                return true
            } else if (jobId) {
                toast.info(t('projects.editor.storyboard.backgroundJobStarted'))
                pollAssetStatus(jobId, id)
                return true
            }
        } catch (error) {
            console.error(`Failed to regenerate character ${char.name}:`, error)
            generatingStates.value[id] = false
            return false
        }
    }

    const handleRegenerateAllCharacters = async (project: any) => {
        const chars = project?.scriptAnalysis?.characters || []
        if (chars.length === 0) return

        toast.info(`${t('projects.editor.storyboard.batchStart')} ${chars.length} ${t('projects.detail.characters')}...`)
        let successCount = 0
        for (let i = 0; i < chars.length; i++) {
            const success = await handleRegenerateCharacter(chars[i], i)
            if (success) successCount++
        }
        toast.success(`${t('projects.editor.storyboard.batchComplete')} ${successCount}/${chars.length} ${t('projects.editor.storyboard.charsUpdated')}`)
    }

    const handleGenerateFrame = async (seg: any) => {
        const id = `seg-${seg.order}`
        generatingStates.value[id] = true
        try {
            const res = await projectStore.generateAsset(projectId, {
                assetName: `Scene_${seg.order}.img`,
                description: seg.description,
                type: 'image',
                segmentOrder: seg.order,
                characterNames: seg.characters,
                generationType: 'scene'
            })

            const data = res.data || res
            const jobId = data.jobId || data.video?.veoJobId

            if (data.s3Key) {
                seg.sceneImage = data.s3Key
                projectStore.syncAssetToElements(`Scene_${seg.order}.img`, data.s3Key)
                await projectStore.fetchProject(projectId)
                generatingStates.value[id] = false
                return true
            } else if (jobId) {
                toast.info(t('projects.editor.storyboard.backgroundJobStarted'))
                pollAssetStatus(jobId, id)
                return true
            }
        } catch (error) {
            console.error(`Failed to generate frame for ${seg.title}:`, error)
            generatingStates.value[id] = false
            return false
        }
    }

    const handleGenerateAllFrames = async (project: any) => {
        const segments = project?.storyboard?.segments || []
        if (segments.length === 0) return

        toast.info(`${t('projects.editor.storyboard.batchStart')} ${segments.length} ${t('projects.editor.storyboard.title')}...`)
        let successCount = 0
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i]
            const success = await handleGenerateFrame(seg)
            if (success) successCount++
        }
        toast.success(`${t('projects.editor.storyboard.batchComplete')} ${successCount}/${segments.length} ${t('projects.editor.storyboard.framesUpdated')}`)
    }

    const handleGenerateVideo = async (seg: any) => {
        const id = `video-${seg.order}`
        generatingStates.value[id] = true
        try {
            const res = await projectStore.generateAsset(projectId, {
                segmentOrder: seg.order,
                type: 'video',
                options: { aspectRatio: projectStore.currentProject?.aspectRatio }
            })

            const data = res.data || res
            const jobId = data.jobId || data.video?.veoJobId

            if (data.s3Key) {
                if (!seg.generatedVideo) seg.generatedVideo = {}
                seg.generatedVideo.s3Key = data.s3Key
                projectStore.syncAssetToElements(`segment_${seg.order}.mp4`, data.s3Key)
                await projectStore.fetchProject(projectId)
                generatingStates.value[id] = false
                return true
            } else if (jobId) {
                toast.info(t('projects.editor.storyboard.backgroundJobStarted'))
                pollAssetStatus(jobId, id)
                return true
            }
        } catch (error: any) {
            console.error(`Failed to generate video for ${seg.title}:`, error)
            toast.error(error.response?.data?.message || t('common.failed'))
            generatingStates.value[id] = false
            return false
        }
    }

    const handleGenerateAllVideos = async (project: any) => {
        if (!project || projectStore.isProcessing) return

        try {
            toast.info(t('projects.editor.storyboard.videoBatchStart'))
            await projectStore.generateStoryboardAssetsBatch(projectId)
            await projectStore.fetchProject(projectId)
        } catch (error: any) {
            console.error('Batch generation failed:', error)
            toast.error(error.response?.data?.message || t('common.failed'))
        }
    }
    
    const handleGenerateVoiceover = async (seg: any) => {
        const id = `audio-${seg.order}`
        let ttsText = seg.voiceover?.trim()
        
        // Fallback: If no explicit voiceover, form a narration from title and description
        if (!ttsText) {
            console.warn(`No explicit voiceover for segment ${seg.order}, using fallback narration.`)
            ttsText = `${seg.title}. ${seg.description || ''}`
        }

        generatingStates.value[id] = true
        try {
            const res = await projectStore.generateVoiceover(projectId, seg.order, {
                text: ttsText,
                language: projectStore.currentProject?.scriptAnalysis?.language || 'English'
            })
            seg.generatedAudio = res?.generatedAudio
            toast.success(t('projects.editor.storyboard.voiceoverReady') || 'Voiceover ready!')
            await projectStore.fetchProject(projectId);
            return true
        } catch (error: any) {
            console.error(`Failed to generate voiceover for ${seg.title}:`, error)
            toast.error(error.response?.data?.error || t('common.failed'))
            return false
        } finally {
            generatingStates.value[id] = false
        }
    }

    const handleGenerateAllVoiceovers = async (project: any) => {
        const segments = project?.storyboard?.segments || []
        // We now allow all segments; if voiceover is empty, it uses fallback
        if (segments.length === 0) {
            toast.warning('No segments to generate voiceover for.')
            return
        }
        toast.info(`Generating voiceovers for ${segments.length} segments...`)
        let successCount = 0
        for (const seg of segments) {
            const ok = await handleGenerateVoiceover(seg)
            if (ok) successCount++
        }
        toast.success(`Voiceovers complete: ${successCount}/${segments.length}`)
    }

    const handleGenerateMusic = async () => {
        const id = 'bgm'
        generatingStates.value[id] = true
        try {
            // Priority: scriptAnalysis.audio.music -> scriptAnalysis.mood -> default
            let musicPrompt = projectStore.currentProject?.scriptAnalysis?.audio?.music
            const mood = projectStore.currentProject?.scriptAnalysis?.mood || 'cinematic'
            
            if (!musicPrompt) {
                musicPrompt = `Cinematic background music with a ${mood} atmosphere, perfectly suited for a video project.`
            }

            toast.info(`Generating music: ${mood}...`)
            await projectStore.generateMusic(projectId, {
                prompt: musicPrompt,
                mood: mood
            })
            await projectStore.fetchProject(projectId)
            toast.success(t('projects.editor.storyboard.musicReady') || 'Background music ready!')
            return true
        } catch (error: any) {
            console.error('Failed to generate music:', error)
            toast.error(error.message || t('common.failed'))
            return false
        } finally {
            generatingStates.value[id] = false
        }
    }

    const handleGenerateAllSequential = async (project: any) => {
        if (!project || projectStore.isProcessing) return
        
        try {
            // PHASE 1: Characters
            const chars = project?.scriptAnalysis?.characters || []
            if (chars.length > 0) {
                toast.info(`${t('projects.editor.storyboard.batchStart')} ${chars.length} characters...`)
                for (let i = 0; i < chars.length; i++) {
                    if (!chars[i].referenceImage) {
                        await handleRegenerateCharacter(chars[i], i)
                    }
                }
            }

            // PHASE 2: Frames
            const segments = project?.storyboard?.segments || []
            if (segments.length > 0) {
                toast.info(`${t('projects.editor.storyboard.batchStart')} ${segments.length} frames...`)
                for (const seg of segments) {
                    if (!seg.sceneImage) {
                        await handleGenerateFrame(seg)
                    }
                }
            }

            // PHASE 3: Videos (Batch)
            toast.info(t('projects.editor.storyboard.videoBatchStart'))
            await projectStore.generateStoryboardAssetsBatch(projectId)

            // PHASE 4: Audio (VO)
            toast.info('Generating Voiceovers for all segments...')
            for (const seg of segments) {
                if (seg.voiceover && seg.voiceover.trim().length > 0) {
                    await projectStore.generateVoiceover(projectId, seg._id, {
                        text: seg.voiceover,
                        language: project.language || 'English'
                    })
                }
            }

            await projectStore.fetchProject(projectId)
            toast.success('all sequential generation tasks started / completed.')
        } catch (error: any) {
            console.error('Sequential generation failed:', error)
            toast.error(error.message || t('common.failed'))
        }
    }

    const handleUploadCharacterImage = async (char: any, index: number) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'

        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            const id = char.char_id;//`char-${index}`
            generatingStates.value[id] = true

            try {
                const responseData = await projectStore.uploadAsset(projectId, file, 'character', id.toString())
                toast.success(t('projects.editor.uploadSuccess'))
                if (responseData.s3Key) {
                    projectStore.syncAssetToElements(`Element_${char.name}.img`, responseData.s3Key)
                    char.referenceImage = responseData.s3Key
                }
            } catch (error) {
                console.error(`Failed to upload character image:`, error)
            } finally {
                generatingStates.value[id] = false
            }
        }

        input.click()
    }

    const handleUploadImageVideo = async (seg: any) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*,video/*'

        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            const id = seg.order;//`seg-${seg.order}`
            generatingStates.value[id] = true

            try {
                const responseData = await projectStore.uploadAsset(projectId, file, 'segment', id.toString())
                toast.success(t('projects.editor.uploadSuccess'))
                if (responseData.s3Key) {
                    if (file.type.startsWith('image/')) {
                        seg.sceneImage = responseData.s3Key
                        projectStore.syncAssetToElements(`Scene_${id}.img`, responseData.s3Key)
                    } else if (file.type.startsWith('video/')) {
                        if (!seg.generatedVideo) seg.generatedVideo = {}
                        seg.generatedVideo.s3Key = responseData.s3Key
                        projectStore.syncAssetToElements(`video_${id}.mp4`, responseData.s3Key)
                    }
                }
            } catch (error) {
                console.error(`Failed to upload segment asset:`, error)
            } finally {
                generatingStates.value[id] = false
            }
        }

        input.click()
    }

    return {
        generatingStates,
        handleRegenerateCharacter,
        handleRegenerateAllCharacters,
        handleGenerateFrame,
        handleGenerateAllFrames,
        handleGenerateVideo,
        handleGenerateAllVideos,
        handleGenerateMusic,
        handleGenerateVoiceover,
        handleGenerateAllVoiceovers,
        handleGenerateAllSequential,
        handleUploadCharacterImage,
        handleUploadImageVideo
    }
}
