
import { defineEventHandler, readBody, createError } from 'h3'
import { generateJSONWithGemini } from '../../../utils/gemini'
import { generateImage } from '../../../utils/geminiImage'
import { Project } from '../../../models/Project'
import { logProjectEvent } from '../../../utils/projectLogger'


export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const projectId = event.context.params?.id
    const body = await readBody(event)
    const { message } = body // User's input message (Context)

    // 1. Fetch Project Data
    const project = await Project.findById(projectId)
    if (!project) {
        throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }

    // Credits Check & Deduction for LLM
    const { deductCredits, getCreditCost } = await import('../../../utils/credits')
    const llmCost = await getCreditCost('text')
    try {
        await deductCredits(user._id, llmCost, 'Generate visual generation strategy')
    } catch (error: any) {
        throw createError({ statusCode: 402, statusMessage: error.message || 'Insufficient credits' })
    }

    // 2. Prepare Context from Project Data
    const projectContext = {
        title: project.title,
        analysis: project.scriptAnalysis,
        creativeBrief: project.creativeBrief,
        storyboard: project.storyboard,
        script: project.scriptContent
    }

    const language = project.scriptAnalysis?.language || 'English'

    // 3. Construct Prompt for Visual Strategy & Assets
    const prompt = `
    You are an AI Film Director and Visual Supervisor.
    
    PROJECT CONTEXT:
    Title: ${projectContext.title}
    Language: ${language}
    Script Summary: ${JSON.stringify(projectContext.analysis?.summary)}
    Creative Brief (Visual Style): ${projectContext.creativeBrief?.visualStyle}
    Characters: ${JSON.stringify(projectContext.analysis?.characters)}
    Selected Segment (if any): Intr/Opening

    USER REQUEST: "${message}"

    TASK:
    Generate a formatted "Visual Generation Strategy" in steps and a list of "Visual Assets".

    REQUIREMENTS:
    1.  **Visual Strategy Plan**: Break down the visualization process into 3-4 distinct steps.
        *   Each step must have a 'title' (e.g., "Character Design", "Scene Formulation") and a 'description' (mentioning specific models like "Nano Banana Pro @ 2K" or "Seedance 1.5").
        *   Set status to 'pending'.

    2.  **Visual Assets List**: Generate EXACTLY one visual asset for EACH entry in the "Characters" list provided in the context.
        *   Do not generate generic props unless they are explicitly listed as characters/key elements.
        *   The asset 'name' MUST include the character's name for easy matching (e.g., "Element_Ava.img").
        *   The 'description' should be a specific visual prompt for that character.
    
    3.  **Completion Message**: A short message confirming the plan is ready.

    OUTPUT FORMAT (JSON):
    {
        "plan_steps": [
            { "title": "Step Title", "description": "Step specific technical description", "status": "pending" }
        ],
        "assets": [
            { "name": "Element_[Character Name].img", "description": "Visual prompt for character", "status": "ready" }
        ],
        "completion_message": "Short completion text..."
    }
    `

    try {
        // 4. Call Gemini
        const result = await generateJSONWithGemini(prompt)

        // 4. Update Project with Plan & Pending Assets
        project.creativeBrief = {
            visualStyle: projectContext.creativeBrief?.visualStyle || '',
            artDirection: '', // could extract more if needed
            colorPalette: [],
            lightingValues: '',
            generatedAt: new Date()
        }

        // Map assets to schema format
        const pendingAssets = result.assets.map((asset: any) => ({
            name: asset.name,
            description: asset.description,
            type: 'image',
            status: 'pending', // Set to pending for async gen
            createdAt: new Date()
        }))

        // Replace or Append? Let's replace for a new plan generation or merge? 
        // User request usually implies a new plan. Let's overwrite visualAssets for this new plan pass.
        project.visualAssets = pendingAssets

        await project.save()

        // 5. Log the Plan & Assets to Chat History
        // Log the Path
        await logProjectEvent(projectId as string, {
            role: 'assistant',
            type: 'visual-path',
            content: '', // No text content needed for this card
            metadata: {
                path: {
                    steps: result.plan_steps
                }
            }
        })

        // Log the Assets
        await logProjectEvent(projectId as string, {
            role: 'assistant',
            type: 'visual-assets',
            content: result.completion_message, // Use completion message as the main text
            metadata: {
                assets: pendingAssets
            }
        })

        return {
            success: true,
            data: {
                ...result,
                assets: pendingAssets // Return pending assets
            }
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
