import axios from 'axios';
import { Logger } from '~/utils/Logger.js';

export interface IOpenAIConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
}

/**
 * OpenAIClient: Client for OpenAI and OpenAI-compatible providers (DeepSeek, OpenRouter, etc.)
 */
export class OpenAIClient {
    private apiKey: string;
    private baseUrl: string;
    private organization?: string;

    constructor(options: IOpenAIConfig) {
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
        this.organization = options.organization;
    }

    /**
     * Generate Content (Chat Completion format)
     */
    public async generateContent(prompt: string | any[], modelId: string = 'gpt-4o', options: any = {}) {
        try {
            const messages = this.formatMessages(prompt, options.systemPrompt);
            
            const payload: any = {
                model: modelId,
                messages: messages,
                max_tokens: options.maxTokens || 4096,
                temperature: options.temperature ?? 0.7,
                stream: false,
                ...options.extraParams
            };

            if (options.jsonMode || options.responseFormat === 'json_object') {
                payload.response_format = { type: 'json_object' };
            }

            Logger.info(`[OpenAIClient] Sending request to ${this.baseUrl}/chat/completions`, 'OpenAIClient');
            
            const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    ...(this.organization ? { 'OpenAI-Organization': this.organization } : {})
                },
                timeout: options.timeout || 60000
            });

            const choice = response.data?.choices?.[0];
            const content = choice?.message?.content || '';
            
            return {
                text: content,
                usage: response.data?.usage,
                raw: response.data
            };
        } catch (error: any) {
            const status = error.response?.status;
            const errorMsg = error.response?.data?.error?.message || error.message;
            Logger.error(`[OpenAIClient] Request failed (${status}): ${errorMsg}`, 'OpenAIClient');
            throw new Error(`OpenAI API Error: ${errorMsg}`);
        }
    }

    /**
     * Generate Image (DALL-E format)
     */
    public async generateImage(prompt: string, modelId: string = 'dall-e-3', options: any = {}) {
        try {
            const payload: any = {
                model: modelId,
                prompt: prompt,
                n: 1,
                size: options.size || '1024x1024',
                response_format: 'b64_json',
                ...options.extraParams
            };

            Logger.info(`[OpenAIClient] Sending Image request to ${this.baseUrl}/images/generations`, 'OpenAIClient');

            const response = await axios.post(`${this.baseUrl}/images/generations`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: options.timeout || 120000
            });

            const imageData = response.data?.data?.[0];
            if (imageData?.b64_json) {
                return {
                    url: `data:image/png;base64,${imageData.b64_json}`,
                    mimeType: 'image/png'
                };
            } else if (imageData?.url) {
                return {
                    url: imageData.url,
                    mimeType: 'image/png'
                };
            }

            throw new Error('No image data in OpenAI response');
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            Logger.error(`[OpenAIClient] Image generation failed: ${errorMsg}`, 'OpenAIClient');
            throw new Error(`OpenAI Image Error: ${errorMsg}`);
        }
    }


    /**
     * Helper to format content into OpenAI messages structure
     */
    private formatMessages(prompt: string | any[], systemPrompt?: string): any[] {
        const messages: any[] = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        if (typeof prompt === 'string') {
            messages.push({ role: 'user', content: prompt });
        } else if (Array.isArray(prompt)) {
            // Handle multi-turn or multi-modal prompt if mapped
            // Simplified: assume it's already in OpenAI format or a Gemini-style parts array
            const userContent: any[] = [];
            
            for (const part of prompt) {
                if (part.text) {
                    userContent.push({ type: 'text', text: part.text });
                } else if (part.inlineData) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                        }
                    });
                } else if (typeof part === 'string') {
                    userContent.push({ type: 'text', text: part });
                }
            }
            
            messages.push({ role: 'user', content: userContent });
        }

        return messages;
    }

    /**
     * List Models (OpenAI format)
     */
    public async listModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return response.data?.data || [];
        } catch (error) {
            Logger.error(`[OpenAIClient] List models failed: ${error}`, 'OpenAIClient');
            return [];
        }
    }
}
