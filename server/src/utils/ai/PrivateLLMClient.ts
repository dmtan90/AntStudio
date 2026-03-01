import axios from 'axios';
import { Logger } from '../Logger.js';

/**
 * Client for communicating with private/local LLMs via Ollama.
 */
export class PrivateLLMClient {
    private baseUrl: string;
    private defaultModel: string = 'llama3';

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generates a completion using a local model.
     */
    public async chat(prompt: string, options: { model?: string, system?: string } = {}) {
        try {
            const model = options.model || this.defaultModel;
            Logger.info(`🧠 [PrivateAI] Prompting local model: ${model}`, 'PrivateLLMClient');

            const response = await axios.post(`${this.baseUrl}/api/chat`, {
                model: model,
                messages: [
                    { role: 'system', content: options.system || 'You are an elite AI Broadcast Director.' },
                    { role: 'user', content: prompt }
                ],
                stream: false
            });

            return response.data.message.content;
        } catch (error: any) {
            Logger.error(`❌ [PrivateAI] Local LLM request failed: ${error.message}`, 'PrivateLLMClient');
            return null;
        }
    }

    /**
     * Verifies if the local Ollama instance is reachable.
     */
    public async testConnection() {
        try {
            const res = await axios.get(`${this.baseUrl}/api/tags`);
            return res.status === 200;
        } catch {
            return false;
        }
    }
}

export const privateLLMClient = new PrivateLLMClient();
