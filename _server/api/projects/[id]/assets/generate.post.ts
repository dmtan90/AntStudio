
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { Project } from '../../../../models/Project'
import { logProjectEvent } from '../../../../utils/projectLogger'
import { deductCredits, getCreditCost } from '../../../../utils/credits'

export default defineEventHandler(async (event) => {
    const projectId = getRouterParam(event, 'id')
    const user = event.context.user
    const body = await readBody(event)
    const { assetName, description, type, characterNames, segmentId } = body

    if (!projectId || !user) {
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })
    }

    // 1. Fetch Project
    const project = await Project.findById(projectId)
    if (!project) {
        throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }

    // 2. Resolve Segment if segmentId is provided
    let segment: any = null
    if (segmentId) {
        segment = project.storyboard?.segments?.find(s => s._id.toString() === segmentId || s.order === parseInt(segmentId))
    } else if (assetName && (assetName.toLowerCase().startsWith('scene_') || assetName.toLowerCase().startsWith('segment_'))) {
        // Fallback: try to find segment by name if segmentId is missing but assetName follows pattern
        const segOrder = parseInt(assetName.split('_')[1])
        segment = project.storyboard?.segments?.find(s => s.order === segOrder)
    }

    const effectiveType = type || (segment ? 'video' : 'image')
    const effectiveDescription = description || segment?.description || ''
    const effectiveAssetName = assetName || (segment ? `segment_${segment.order}.${effectiveType === 'video' ? 'mp4' : 'img'}` : 'unnamed_asset')

    // 3. Credits Check & Deduction
    const baseCreditCost = await getCreditCost(effectiveType === 'video' ? 'video' : 'image')
    let creditAmount = baseCreditCost

    if (effectiveType === 'video') {
        const duration = segment?.duration || 5
        creditAmount = duration * baseCreditCost
    }

    try {
        await deductCredits(user._id, creditAmount, `Generate ${effectiveType}: ${effectiveAssetName}`)
    } catch (error: any) {
        throw createError({ statusCode: 402, statusMessage: error.message || 'Insufficient credits' })
    }

    try {
        let s3Key = ''
        const { getSignedS3Url } = await import('../../../../utils/s3')

        // 4. Handle Video Generation
        if (effectiveType === 'video') {
            const { generateVideo } = await import('../../../../utils/veo3')
            const { buildVeoVideoPrompt } = await import('../../../../utils/videoPromptBuilder')

            let videoPrompt = ''
            let characterImages: string[] = []

            if (segment) {
                // Use standardized prompt builder
                videoPrompt = buildVeoVideoPrompt(
                    segment,
                    project.scriptAnalysis?.characters || [],
                    project.creativeBrief?.visualStyle || project.videoStyle || 'Cinematic'
                )

                // Resolve character reference images
                const characterImagesRaw = project.scriptAnalysis?.characters
                    ?.filter(c => segment.characters?.includes(c.name) && c.referenceImage)
                    .map(c => c.referenceImage) || []

                characterImages = await Promise.all(characterImagesRaw.map(async (key) => {
                    return key!.startsWith('http') ? key! : await getSignedS3Url(key!)
                }))
            } else {
                videoPrompt = effectiveDescription
            }

            // Start frame
            let imageStart = undefined
            const startImageKey = segment?.sceneImage || body.imageStart
            if (startImageKey) {
                imageStart = startImageKey.startsWith('http') ? startImageKey : await getSignedS3Url(startImageKey)
            }

            // End frame
            let imageEnd = undefined
            const nextSegment = segment ? project.storyboard?.segments?.find(s => s.order === segment.order + 1) : null
            const endImageKey = nextSegment?.sceneImage || body.imageEnd
            if (endImageKey) {
                imageEnd = endImageKey.startsWith('http') ? endImageKey : await getSignedS3Url(endImageKey)
            }

            const { jobId } = await generateVideo({
                prompt: videoPrompt,
                duration: segment?.duration || body.duration || 5,
                aspectRatio: project.aspectRatio === '9:16' ? '9:16' : (project.aspectRatio === '1:1' ? '1:1' : '16:9'),
                imageStart,
                imageEnd,
                characterImages: characterImages.length > 0 ? characterImages : undefined
            })

            s3Key = jobId.startsWith('mock-') ? `https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4` : ''

            // Update segment video status if applicable
            if (segment) {
                segment.generatedVideo = {
                    s3Key,
                    status: jobId.startsWith('mock-') ? 'completed' : 'pending',
                    veoJobId: jobId,
                    generatedAt: new Date(),
                    duration: segment.duration || 5
                }
            }
        }
        // 5. Handle Image Generation
        else {
            const { generateImage } = await import('../../../../utils/geminiImage')

            // Prepare character context
            const characterContext: any[] = []
            const charsToLookup = characterNames || segment?.characters || []

            if (charsToLookup.length > 0 && project.scriptAnalysis?.characters) {
                charsToLookup.forEach((name: string) => {
                    const char = project.scriptAnalysis!.characters.find(c =>
                        c.name.toLowerCase() === name.toLowerCase()
                    )
                    if (char) characterContext.push(char)
                })
            }

            const imageResult = await generateImage(
                effectiveDescription,
                projectId,
                effectiveAssetName.replace(/\.(img|png|jpg|jpeg)$/i, ''),
                {
                    aspectRatio: project.aspectRatio === '9:16' ? '9:16' : (project.aspectRatio === '1:1' ? '1:1' : '16:9'),
                    characterContext: characterContext.length > 0 ? characterContext : undefined
                }
            )
            s3Key = imageResult.s3Key

            // Sync with segment if applicable
            if (segment) {
                segment.sceneImage = s3Key
            }
        }

        // 6. Update Visual Asset Record
        const assetIndex = project.visualAssets?.findIndex(a => a.name === effectiveAssetName)
        if (assetIndex !== undefined && assetIndex !== -1 && project.visualAssets) {
            project.visualAssets[assetIndex].status = 'ready'
            project.visualAssets[assetIndex].s3Key = s3Key
            project.visualAssets[assetIndex].description = effectiveDescription
        } else {
            project.visualAssets?.push({
                name: effectiveAssetName,
                description: effectiveDescription,
                type: effectiveType,
                status: 'ready',
                s3Key: s3Key,
                createdAt: new Date()
            })
        }

        // 7. Sync Characters (Heuristic)
        if (project.scriptAnalysis?.characters) {
            const lowerAssetName = effectiveAssetName.toLowerCase()
            project.scriptAnalysis.characters.forEach(char => {
                const charName = char.name.toLowerCase()
                if (lowerAssetName.includes(charName) || lowerAssetName.includes(charName.replace(/\s/g, '_'))) {
                    char.referenceImage = s3Key
                }
            })
        }

        await project.save()

        // 8. Log Event
        await logProjectEvent(projectId, {
            role: 'system',
            type: 'asset_gen',
            content: `Generated ${effectiveType} "${effectiveAssetName}"${segment ? ` for segment ${segment.order}` : ''}.`,
            metadata: { s3Key, type: effectiveType, segmentId: segment?._id }
        })

        return {
            success: true,
            data: {
                name: effectiveAssetName,
                s3Key,
                video: segment?.generatedVideo,
                segment: segment
            }
        }

    } catch (error: any) {
        console.error('Generation failed:', error)

        await logProjectEvent(projectId, {
            role: 'system',
            type: 'event',
            content: `Failed to generate ${effectiveType} ${effectiveAssetName}: ${error.message}`
        })

        // Update status to error
        if (segment && effectiveType === 'video') {
            if (segment.generatedVideo) segment.generatedVideo.status = 'failed'
            await project.save()
        }

        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
