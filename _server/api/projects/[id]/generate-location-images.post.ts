import { Project } from '../../../models/Project'
import { connectDB } from '../../../utils/db'
import { generateImagePlaceholder } from '../../../utils/geminiImage'
import { deductCredits, CREDIT_PRICES } from '../../../utils/credits'

export default defineEventHandler(async (event) => {
    await connectDB()

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    const projectId = getRouterParam(event, 'id')

    // Fetch project
    const project = await Project.findById(projectId)

    if (!project) {
        throw createError({
            statusCode: 404,
            message: 'Project not found'
        })
    }

    // Authorization check
    if (project.userId.toString() !== user._id.toString()) {
        throw createError({
            statusCode: 403,
            message: 'Access denied'
        })
    }

    // Check if script analysis exists
    if (!project.scriptAnalysis) {
        throw createError({
            statusCode: 400,
            message: 'Please analyze the script first'
        })
    }

    // Check if locations exist
    if (!project.scriptAnalysis.locations || project.scriptAnalysis.locations.length === 0) {
        throw createError({
            statusCode: 400,
            message: 'No locations found in script analysis'
        })
    }

    // Filter locations needing images
    const locsToGen = project.scriptAnalysis.locations.filter(l => !l.referenceImage)
    if (locsToGen.length === 0) {
        return { success: true, data: { message: 'All locations already have images' } }
    }

    // Deduct Credits
    const totalCost = locsToGen.length * CREDIT_PRICES.IMAGE_GEN
    try {
        await deductCredits(user._id, totalCost, `Generate ${locsToGen.length} location images`)
    } catch (error: any) {
        throw createError({ statusCode: 402, statusMessage: error.message || 'Insufficient credits' })
    }

    try {
        // Generate images for each location
        const updatedLocations = []

        for (const location of project.scriptAnalysis.locations) {
            if (location.referenceImage) {
                // Skip if already has image
                updatedLocations.push(location)
                continue
            }

            // Create detailed prompt for location image
            const imagePrompt = `Cinematic establishing shot of ${location.name}. ${location.description}. Beautiful composition, atmospheric lighting, high quality, photorealistic style.`

            try {
                // Generate image (using placeholder for now)
                const result = await generateImagePlaceholder(
                    imagePrompt,
                    projectId,
                    `location-${location.name.replace(/\s+/g, '-').toLowerCase()}`
                )

                updatedLocations.push({
                    ...location,
                    referenceImage: result.s3Url
                })

                console.log(`✅ Generated image for location: ${location.name}`)
            } catch (error) {
                console.error(`Failed to generate image for ${location.name}:`, error)
                updatedLocations.push(location)
            }
        }

        // Update project with location images
        project.scriptAnalysis.locations = updatedLocations
        await project.save()

        return {
            success: true,
            data: {
                locations: updatedLocations,
                message: `Generated images for ${updatedLocations.filter(l => l.referenceImage).length} locations`
            }
        }
    } catch (error: any) {
        console.error('Location image generation failed:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to generate location images'
        })
    }
})
