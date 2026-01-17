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

    // Check if characters exist
    if (!project.scriptAnalysis.characters || project.scriptAnalysis.characters.length === 0) {
        throw createError({
            statusCode: 400,
            message: 'No characters found in script analysis'
        })
    }

    // Filter characters needing images
    const charsToGen = project.scriptAnalysis.characters.filter(c => !c.referenceImage)

    if (charsToGen.length === 0) {
        return { success: true, data: { message: 'All characters already have images' } }
    }

    // Deduct Credits
    const totalCost = charsToGen.length * CREDIT_PRICES.IMAGE_GEN
    try {
        await deductCredits(user._id, totalCost, `Generate ${charsToGen.length} character images`)
    } catch (error: any) {
        throw createError({ statusCode: 402, statusMessage: error.message || 'Insufficient credits' })
    }

    try {
        // Generate images for each character
        const updatedCharacters = []

        for (const character of project.scriptAnalysis.characters) {
            if (character.referenceImage) {
                // Skip if already has image
                updatedCharacters.push(character)
                continue
            }

            // Create detailed prompt for character image
            const imagePrompt = `Professional character portrait of ${character.name}. ${character.description}. Cinematic lighting, detailed, high quality, photorealistic style.`

            try {
                // Generate image (using placeholder for now)
                const result = await generateImagePlaceholder(
                    imagePrompt,
                    projectId,
                    `character-${character.name.replace(/\s+/g, '-').toLowerCase()}`
                )

                updatedCharacters.push({
                    ...character,
                    referenceImage: result.s3Url
                })

                console.log(`✅ Generated image for character: ${character.name}`)
            } catch (error) {
                console.error(`Failed to generate image for ${character.name}:`, error)
                updatedCharacters.push(character)
            }
        }

        // Update project with character images
        project.scriptAnalysis.characters = updatedCharacters
        await project.save()

        return {
            success: true,
            data: {
                characters: updatedCharacters,
                message: `Generated images for ${updatedCharacters.filter(c => c.referenceImage).length} characters`
            }
        }
    } catch (error: any) {
        console.error('Character image generation failed:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to generate character images'
        })
    }
})
