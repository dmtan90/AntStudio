import axios from 'axios';
import { Logger } from '~/utils/Logger.js';

export interface IVertexConfig {
    apiKey: string;
    baseUrl?: string;
}

const BASE_URL = 'https://aiplatform.googleapis.com/v1/publishers/google/models/';

/**
 * VertexClient: Client for Google Cloud Vertex AI
 * Supports API Key
 */
export class VertexClient {
    private apiKey?: string;
    private baseUrl?: string;

    constructor(options: IVertexConfig) {
        this.apiKey = options.apiKey;
        this.baseUrl = options.baseUrl || BASE_URL;
    }

    /**
     * Generate Content (Vertex AI Gemini format)
     */
    public async generateContent(prompt: string | any[], modelId: string = 'gemini-1.5-flash', options: any = {}) {
        try {
            const contents = this.formatContents(prompt);
            
            const payload: any = {
                contents: contents,
                generationConfig: {
                    maxOutputTokens: options.maxTokens || 4096,
                    temperature: options.temperature ?? 0.7,
                    ...options.generationConfig
                },
                systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
                tools: options.tools,
            };

            const endpoint = this.getEndpoint(modelId, 'generateContent');
            
            Logger.info(`[VertexClient] Sending request to ${endpoint}`, 'VertexClient');
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            const response = await axios.post(endpoint, payload, {
                headers,
                timeout: options.timeout || 60000
            });

            const candidate = response.data?.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';
            
            return {
                text: text,
                usage: response.data?.usageMetadata,
                raw: response.data
            };
        } catch (error: any) {
            const status = error.response?.status;
            const errorMsg = error.response?.data?.error?.message || error.message;
            Logger.error(`[VertexClient] Request failed (${status}): ${errorMsg}`, 'VertexClient');
            throw new Error(`Vertex AI Error: ${errorMsg}`);
        }
    }

    /**
     * Generate Image (Imagen on Vertex)
     */
    public async generateImage(prompt: string, modelId: string = 'imagen-3.0-generate-001', options: any = {}) {
        try {
            const endpoint = this.getEndpoint(modelId, 'predict');
            
            const payload = {
                instances: [{ prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: options.aspectRatio || '1:1',
                    ...options.parameters
                }
            };

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            const response = await axios.post(endpoint, payload, {
                headers,
                timeout: options.timeout || 60000
            });

            const prediction = response.data?.predictions?.[0];
            if (prediction?.bytesBase64Encoded) {
                return {
                    url: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                    mimeType: 'image/png'
                };
            }
            
            throw new Error('No image data in Vertex prediction response');
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            throw new Error(`Vertex Image Gen Error: ${errorMsg}`);
        }
    }

    /**
     * Resolve API Endpoint
     */
    private getEndpoint(modelId: string, action: string): string {
        // const baseUrl = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelId}:${action}`;
        const baseUrl = `${this.baseUrl}/${modelId}:${action}`;
        
        if (this.apiKey) {
            return `${baseUrl}?key=${this.apiKey}`;
        }
        
        return baseUrl;
    }

    /**
     * Helper to format content into Gemini contents structure
     */
    private formatContents(prompt: string | any[]): any[] {
        if (typeof prompt === 'string') {
            return [{ role: 'user', parts: [{ text: prompt }] }];
        }
        
        if (Array.isArray(prompt)) {
            // Assume multi-turn or parts array
            // If it's a flat array of parts for a single turn:
            return [{ role: 'user', parts: prompt.map(p => typeof p === 'string' ? { text: p } : p) }];
        }
        
        return [];
    }
}
