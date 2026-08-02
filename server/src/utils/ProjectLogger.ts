import { Project } from '../models/Project.js'
import { Logger } from './Logger.js';

export const logProjectEvent = async (
    projectId: string,
    event: {
        role: 'user' | 'assistant' | 'system'
        type: string
        content: string
        metadata?: any
    }
) => {
    try {
        const authorMap: Record<string, string> = {
            'user': 'user',
            'assistant': 'ai',
            'system': 'system'
        }

        const logEntry = {
            author: authorMap[event.role] || 'system',
            content: event.content,
            type: event.type,
            result: event.metadata, // Map metadata to result
            timestamp: new Date()
        }

        await Project.findByIdAndUpdate(projectId, {
            $push: { chatHistory: logEntry }
        })
    } catch (error) {
        Logger.error(`Failed to log project event: ${error}`, 'ProjectLogger');
    }
}
