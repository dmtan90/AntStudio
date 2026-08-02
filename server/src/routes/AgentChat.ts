/**
 * Agent Chat Routes
 * Exposes the AntStudio ADK Agent via REST API for the frontend sidebar
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Logger } from '../utils/Logger.js';

const router = Router();

// All agent routes require authentication
router.use(authMiddleware);

/**
 * POST /api/agent/chat
 * Send a message to the AntStudio AI Agent
 */
router.post('/chat', async (req: AuthRequest, res: Response) => {
    try {
        const { 
            message, 
            language, 
            clearSession, 
            currentPath, 
            screenText, 
            selectedProduct,
            selectedProject,
            selectedInfluencer,
            selectedLiveSession
        } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const userId = req.user!.userId;
        // Get the JWT token from the Authorization header to pass to tool calls
        const authToken = (req.headers.authorization || '').replace('Bearer ', '');

        // Dynamic import to avoid circular dependency at module load time
        const { agentChatService } = await import('../services/ai/AgentChatService.js');

        if (clearSession) {
            agentChatService.clearSession(userId);
        }

        Logger.info(`[AgentChat] User ${userId} (${language}): "${message.substring(0, 80)}..." [Path: ${currentPath || '/'}] [ScreenText: ${screenText ? 'Yes' : 'No'}] [SelectedProduct: ${selectedProduct ? selectedProduct.name : 'None'}] [SelectedProject: ${selectedProject ? selectedProject.title : 'None'}]`);
        const result = await agentChatService.chat(
            userId, 
            authToken, 
            message, 
            language, 
            currentPath, 
            screenText, 
            selectedProduct,
            selectedProject,
            selectedInfluencer,
            selectedLiveSession
        ) as any;
        
        res.json({
            success: true,
            data: {
                response: result.message,
                navigation: result.navigation,
                selectedProduct: result.selectedProduct,
                selectedProject: result.selectedProject,
                selectedInfluencer: result.selectedInfluencer,
                selectedLiveSession: result.selectedLiveSession
            }
        });
    } catch (error: any) {
        Logger.error('[AgentChat] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Agent processing failed'
        });
    }
});

/**
 * GET /api/agent/history
 * Get chat history for the current user
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { agentChatService } = await import('../services/ai/AgentChatService.js');
        const history = agentChatService.getHistory(userId);
        res.json({ success: true, data: history });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/agent/session
 * Clear the current user's chat session
 */
router.delete('/session', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { agentChatService } = await import('../services/ai/AgentChatService.js');
        agentChatService.clearSession(userId);
        res.json({ success: true, message: 'Session cleared' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
