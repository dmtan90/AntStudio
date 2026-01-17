
import { defineEventHandler, readBody, createError } from 'h3'
import { Project } from '../../../models/Project'
import { generateJSONWithGemini } from '../../../utils/gemini'
import { logProjectEvent } from '../../../utils/projectLogger'

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const projectId = event.context.params?.id
    const body = await readBody(event)
    const { message, files } = body

    if (!projectId || !message) {
        throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })
    }

    const project = await Project.findById(projectId)
    if (!project) {
        throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }

    // Credits Check & Deduction for LLM
    const { deductCredits, CREDIT_PRICES } = await import('../../../utils/credits')
    try {
        await deductCredits(user._id, CREDIT_PRICES.LLM_CHAT, 'AI Chat interaction')
    } catch (error: any) {
        throw createError({ statusCode: 402, statusMessage: error.message || 'Insufficient credits' })
    }

    // Fetch recent logs from Chat History
    const history = project.chatHistory
        ?.slice(-20) // Get last 20
        .map(l => `[${l.author?.toUpperCase()}]: ${l.content}`)
        .join('\n') || ''

    // Prepare Context
    const context = `
    PROJECT: ${project.title}
    LANGUAGE: ${project.scriptAnalysis?.language || 'English'}
    
    SUMMARY: ${JSON.stringify(project.scriptAnalysis?.summary || {})}
    CHARACTERS: ${JSON.stringify(project.scriptAnalysis?.characters || [])}
    STYLE: ${project.creativeBrief?.visualStyle || 'Cinematic'}
    
    VISUAL ASSETS STATUS:
    ${project.visualAssets?.map(a => `- ${a.name}: ${a.status} (${(a.url || a.s3Key) ? 'Ready' : 'Not Generated'})`).join('\n') || 'None'}

    RECENT PROJECT LOGS:
    ${history}
    `

    const systemPrompt = `
    You are Flova, an AI Film Director and Assistant.
    Your goal is to help the user build their video project.
    
    CONTEXT:
    ${context}

    USER INPUT: "${message}"

    INSTRUCTIONS:
    1. Respond naturally to the user.
    2. If the user asks to generate assets or plan, confirm you can do it (but currently you are in CHAT mode, specific commands trigger other endpoints, but here just guide them).
    3. Use the Project Logs to answer questions about what happened (e.g. "What did we just generate?").
    4. Keep answers concise and helpful.
    5. Be "Context Aware" - if assets are pending, mention that.
    
    OUTPUT FORMAT:
    Respond with a JSON object:
    {
        "role": "assistant",
        "content": "Your text response here...",
        "type": "text" 
    }
    `

    try {
        const response = await generateJSONWithGemini(systemPrompt)

        // Log the interaction
        await logProjectEvent(projectId, {
            role: 'user',
            type: 'chat',
            content: message
        })

        await logProjectEvent(projectId, {
            role: 'assistant',
            type: 'chat',
            content: response.content
        })

        return {
            success: true,
            data: response
        }

    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }
})
