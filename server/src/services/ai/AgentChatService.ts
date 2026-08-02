/**
 * AgentChatService
 * 
 * Wraps the AntStudio ADK rootAgent with an InMemoryRunner,
 * allowing the Express server to process chat messages from the frontend.
 */

import { InMemoryRunner, Runner } from '@google/adk';
import { rootAgent } from '../../agent/agent.js';
import { 
    setAllAuthTokens, 
    getLastActiveProduct, 
    clearLastActiveProduct,
    getLastActiveProject,
    clearLastActiveProject,
    getLastActiveInfluencer,
    clearLastActiveInfluencer,
    getLastActiveLiveSession,
    clearLastActiveLiveSession
} from '../../agent/tools/index.js';
import { createUserContent } from '@google/genai';
import { Logger } from '../../utils/Logger.js';


interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface ChatSession {
    runner: Runner;
    history: ChatMessage[];
    userId: string;
    sessionId: string;
    lastActive: number;
}

// In-memory session store (one per user)
const sessions = new Map<string, ChatSession>();

function detectLanguage(text: string): 'en' | 'vi' {
    const clean = text.toLowerCase().trim();
    if (!clean) return 'vi';

    // If it contains Vietnamese accented chars, it is definitely Vietnamese
    const viChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (viChars.test(clean)) return 'vi';

    // Common Vietnamese words (with or without tones!)
    const viWords = /\b(tạo|tao|xem|xóa|xoa|sản phẩm|san pham|dự án|du an|liệt kê|liet ke|danh sách|danh sach|cập nhật|cap nhat|tồn kho|ton kho|cho|của|cua|tôi|toi|bản|ban|kịch|kich|chạy|chay|livestream|xin chào|xin chao)\b/i;
    if (viWords.test(clean)) return 'vi';

    // Otherwise, check if it has common English words
    const enWords = /\b(create|list|show|view|delete|update|stock|product|products|project|projects|script|run|my|me|hello|hi|please|for|the|of|to|in)\b/i;
    if (enWords.test(clean)) return 'en';

    return 'en'; // default fallback
}

// Tool-to-Route automatic navigation mapping
const toolRouteMap: Record<string, string> = {
    'listProducts': '/merchants',
    'createProduct': '/merchants',
    'updateProduct': '/merchants',
    'deleteProduct': '/merchants',
    'listProjects': '/projects',
    'createProject': '/projects',
    'generateScript': '/projects',
    'analyzeProjectScript': '/projects',
    'generateStoryboard': '/projects',
    
    // Influencer / Avatar tools -> /influencer
    'listInfluencers': '/influencer',
    'getInfluencer': '/influencer',
    'updateInfluencer': '/influencer',
    'deleteInfluencer': '/influencer',
    'generateProductVideo': '/influencer',
    'getSalesPlaylist': '/influencer',
    
    // Live Studio / Live Stream tools -> /live/studio
    'listLiveSessions': '/live/studio',
    'getLiveSession': '/live/studio',
    'showProductInLive': '/live/studio',
    'switchLiveScene': '/live/studio',
    'sendMessageToStream': '/live/studio',
    'playAudioInStream': '/live/studio',
    'highlightComment': '/live/studio',
    'syncProjectInventory': '/live/studio',
    'triggerFlashSale': '/live/studio',
    
    // Platform Management tools -> /settings or /developer
    'listPlatforms': '/settings',
    'getPlatformAuthUrl': '/settings',
    'disconnectPlatform': '/settings',
    'getPlatformStats': '/settings',
    'listPlatformVideos': '/settings',
    'getLiveStreamInfo': '/settings',
};

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Clean up stale sessions every 10 minutes

// Clean up stale sessions every 10 minutes
setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, userId) => {
        if (now - session.lastActive > SESSION_TIMEOUT_MS) {
            sessions.delete(userId);
            Logger.info(`[AgentChat] Cleared stale session for user ${userId}`);
        }
    });
}, 10 * 60 * 1000);

export class AgentChatService {
    /**
     * Get or create a chat session for a user
     */
    private getOrCreateSession(userId: string, authToken: string, language: string = 'en'): ChatSession {
        let session = sessions.get(userId);
        if (!session) {
            const runner = new InMemoryRunner({
                agent: rootAgent,
                appName: 'antstudio_agent',
            });
            session = {
                runner,
                history: [],
                userId,
                sessionId: `${userId}_session`,
                lastActive: Date.now()
            };
            sessions.set(userId, session);
            Logger.info(`[AgentChat] Created new session for user ${userId} (Lang: ${language})`);
        }
        session.lastActive = Date.now();
        // Inject the user's auth token into all tools
        setAllAuthTokens(authToken);
        return session;
    }

    /**
     * Send a message and get a response from the agent
     */
    async chat(
        userId: string, 
        authToken: string, 
        userMessage: string, 
        language: string = 'en', 
        currentPath?: string, 
        screenText?: string, 
        selectedProduct?: any,
        selectedProject?: any,
        selectedInfluencer?: any,
        selectedLiveSession?: any
    ): Promise<{
        message: string, 
        navigation?: string, 
        selectedProduct?: any,
        selectedProject?: any,
        selectedInfluencer?: any,
        selectedLiveSession?: any
    }> {
        const session = this.getOrCreateSession(userId, authToken, language);

        // Add user message to history
        session.history.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        });

        try {
            // Append language and context instruction
            let contextNote = `(Note: Please reply in the EXACT same language as the user's message above (e.g. if the user messages in English, reply in English; if they message in Vietnamese, reply in Vietnamese).`;
            if (currentPath) {
                contextNote += ` The user is currently viewing the app screen at path: '${currentPath}'.`;
            }
            if (selectedProduct) {
                contextNote += ` The active selected product context is: ${JSON.stringify(selectedProduct)}.`;
            }
            if (selectedProject) {
                contextNote += ` The active selected project context is: ${JSON.stringify(selectedProject)}.`;
            }
            if (selectedInfluencer) {
                contextNote += ` The active selected influencer context is: ${JSON.stringify(selectedInfluencer)}.`;
            }
            if (selectedLiveSession) {
                contextNote += ` The active selected live session context is: ${JSON.stringify(selectedLiveSession)}.`;
            }
            if (screenText) {
                // Remove some clutter if needed, but basically include the visible text
                const cleanText = screenText.replace(/\n\s*\n/g, '\n').trim();
                contextNote += ` The current visible text on their screen (including open dialogs/modals) is: """${cleanText}""".`;
            }
            contextNote += ` You can provide suggestions or use tools relevant to this screen context.)`;
            const localizedMessage = `${userMessage}\n\n${contextNote}`;
            
            // Run the agent
            const content = createUserContent(localizedMessage);
            Logger.info(`[AgentChat] Sending request to AI for user ${userId}...`);

            // Clear any stale active state before running the agent
            clearLastActiveProduct();
            clearLastActiveProject();
            clearLastActiveInfluencer();
            clearLastActiveLiveSession();

            let fullResponse = '';
            let navigationTarget: string | undefined;

            // Use runEphemeral to avoid session management errors
            // This creates a temporary session for each request, ensuring stability
            const generator = session.runner.runEphemeral({
                userId,
                newMessage: content,
            });

            for await (const event of generator) {
                Logger.info(`[AgentChat] Raw Event: ${JSON.stringify(event)}`);
                // Log the event flow to understand what the agent is doing (Thinking vs Tool Calling)
                const partsInfo = event.content?.parts?.map((p: any) => p.text ? 'text' : 'tool_call') || [];
                Logger.info(`[AgentChat] Event from ${event.author}: [${partsInfo.join(', ')}]`);

                if (event.content?.parts) {
                    for (const part of event.content.parts) {
                        if (part.text) {
                            fullResponse += part.text;
                        }
                        
                        const p = part as any;
                        if (p.functionCall) {
                            Logger.info(`[AgentChat] Tool Call: ${p.functionCall.name}`);
                            if (p.functionCall.name === 'navigateTo') {
                                navigationTarget = p.functionCall.args?.path;
                            } else if (toolRouteMap[p.functionCall.name]) {
                                navigationTarget = toolRouteMap[p.functionCall.name];
                                Logger.info(`[AgentChat] Auto navigating to ${navigationTarget} due to tool call ${p.functionCall.name}`);
                            }
                        }
                    }
                }
            }

            if (!fullResponse) {
                Logger.warn(`[AgentChat] AI returned an empty response for user ${userId}`);
                fullResponse = language === 'en' 
                    ? "I'm sorry, I couldn't process that right now. Please try again." 
                    : "Xin lỗi, tôi không thể xử lý yêu cầu lúc này. Vui lòng thử lại.";
            } else {
                Logger.info(`[AgentChat] Received AI response (${fullResponse.length} chars)`);
            }

            // Capture last active states that were set by any tools during this agent turn
            const activeProduct = getLastActiveProduct();
            const activeProject = getLastActiveProject();
            const activeInfluencer = getLastActiveInfluencer();
            const activeLiveSession = getLastActiveLiveSession();
            
            clearLastActiveProduct();
            clearLastActiveProject();
            clearLastActiveInfluencer();
            clearLastActiveLiveSession();

            // Add assistant response to history
            session.history.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: Date.now()
            });

            return { 
                message: fullResponse, 
                navigation: navigationTarget,
                selectedProduct: activeProduct || undefined,
                selectedProject: activeProject || undefined,
                selectedInfluencer: activeInfluencer || undefined,
                selectedLiveSession: activeLiveSession || undefined
            };
        } catch (error: any) {
            Logger.error(`[AgentChat] Error processing message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get chat history for a user
     */
    getHistory(userId: string): ChatMessage[] {
        return sessions.get(userId)?.history || [];
    }

    /**
     * Clear chat session for a user
     */
    clearSession(userId: string): void {
        sessions.delete(userId);
    }
}

export const agentChatService = new AgentChatService();
