import axios from 'axios';


import { Logger } from '../Logger.js';

// Simple helper to resolve object paths if lodash is not available or desired
const resolvePath = (obj: any, path: string) => {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null
    }, obj)
}

// Helper to replace placeholders in template string
const fillTemplate = (template: string, variables: Record<string, any>, escapeJson = false) => {
    if (typeof template !== 'string') return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        // Support nested keys in variables
        const value = resolvePath(variables, key.trim());
        if (value === undefined || value === null) return match;

        let stringValue = String(value);
        if (escapeJson) {
            // Escape for JSON string value safely (avoids "Bad control character" errors)
            stringValue = JSON.stringify(stringValue).slice(1, -1);
        }
        return stringValue;
    });
}

export interface IPollConfig {
    endpoint: string
    method?: 'GET' | 'POST'
    headers?: Record<string, string>
    intervalMs?: number
    timeoutMs?: number
    statusPath?: string
    successValues?: string[]
    failureValues?: string[]
    responseMapping?: {
        url?: string
        b64?: string
        text?: string
    }
}

export interface ITaskConfig {
    endpoint: string
    method?: 'POST' | 'GET'
    headers?: Record<string, string>
    payloadTemplate?: string
    responseMapping?: {
        text?: string
        url?: string
        b64?: string
        jobId?: string
    }
    pollConfig?: IPollConfig
}

export class CustomAIAdapter {
    private apiKey: string;
    private baseUrl: string;
    // Map of task type -> config
    private taskConfigs: Map<string, ITaskConfig> = new Map();

    constructor(apiKey: string, baseUrl: string, taskConfigs?: Map<string, any> | Record<string, any>) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';

        if (taskConfigs) {
            // Handle both Map and Object input (Mongoose Map vs POJO)
            if (taskConfigs instanceof Map) {
                // Convert Mongoose Map to internal map if needed or just use it
                // We ideally want a plain object map logic
                taskConfigs.forEach((value, key) => this.taskConfigs.set(key, value));
            } else {
                Object.entries(taskConfigs).forEach(([key, value]) => this.taskConfigs.set(key, value));
            }
        }
    }

    /**
     * Generic execution method based on task config
     */
    private async executeTask(taskType: string, variables: Record<string, any>, defaultEndpointSuffix: string, defaultPayload: any) {
        const config = this.taskConfigs.get(taskType);

        let url = this.baseUrl ? `${this.baseUrl}${defaultEndpointSuffix}` : '';
        let method = 'POST';
        let headers: any = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
        let data = defaultPayload;

        // Overlay Custom Config if exists
        if (config) {
            if (config.endpoint) url = config.endpoint;
            if (config.method) method = config.method;
            if (config.headers) {
                let rawHeaders: any = {};

                if (typeof config.headers === 'string') {
                    try {
                        rawHeaders = JSON.parse(config.headers);
                    } catch (e) {
                        Logger.error(`Failed to parse headers JSON for ${taskType}:`, e);
                        rawHeaders = {};
                    }
                } else {
                    // Convert to plain object if it's a Mongoose Map or similar to strip internal properties
                    rawHeaders = (typeof (config.headers as any).toObject === 'function')
                        ? (config.headers as any).toObject()
                        : config.headers;
                }

                // Merge/Replace headers. Support {{apiKey}} in headers
                Object.entries(rawHeaders).forEach(([k, v]) => {
                    // CRITICAL: Strip any internal Mongoose properties (like $__parent) 
                    // which cause "Invalid character in header content" errors.
                    if (k.startsWith('$')) return;

                    if (typeof v === 'string') {
                        headers[k] = v.replace('{{apiKey}}', this.apiKey);
                    } else if (v !== undefined && v !== null) {
                        headers[k] = String(v);
                    }
                });
            }

            const contentType = (headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
            const isMultipart = contentType.includes('multipart/form-data');
            const isFormUrlEncoded = contentType.includes('application/x-www-form-urlencoded');
            const isJson = contentType.includes('application/json') || !contentType;

            if (config.payloadTemplate) {
                try {
                    // We ALMOST ALWAYS want to parse the template as JSON first to get an object,
                    // so we should ALMOST ALWAYS use escapeJson = true if it looks like JSON.
                    const trimmedTemplate = config.payloadTemplate.trim();
                    const shouldEscape = trimmedTemplate.startsWith('{') || trimmedTemplate.startsWith('[') || isJson;
                    const populatedString = fillTemplate(config.payloadTemplate, variables, shouldEscape);

                    if (isJson) {
                        data = JSON.parse(populatedString);
                    } else if (isFormUrlEncoded) {
                        try {
                            const parsed = JSON.parse(populatedString);
                            const params = new URLSearchParams();
                            Object.entries(parsed).forEach(([key, val]) => params.append(key, String(val)));
                            data = params.toString();
                        } catch (e) {
                            data = populatedString;
                        }
                    } else if (isMultipart) {
                        // Use global FormData if available (Node 18+) or axios will handle objects
                        // Note: In Node.js, we might need to check if FormData is available
                        let FormClass = (globalThis as any).FormData;

                        // Fallback to formdata-node if global FormData is not available or behaves unexpectedly in Node
                        if (!FormClass) {
                            try {
                                const { FormData: NodeFormData } = await import('formdata-node');
                                FormClass = NodeFormData;
                            } catch (e) {
                                Logger.error('[CustomAdapter] formdata-node not found and global FormData missing');
                            }
                        }

                        if (FormClass) {
                            const form = new FormClass();
                            try {
                                const parsed = JSON.parse(populatedString);
                                Object.entries(parsed).forEach(([key, val]) => form.append(key, String(val)));
                                data = form;
                                // Axios automatically sets the boundary for FormData
                                delete headers['Content-Type'];
                                delete headers['content-type'];
                            } catch (e: any) {
                                Logger.error(`[CustomAdapter] Failed to parse multipart template as JSON for ${taskType}:`, e.message);
                                throw new Error(`Invalid JSON in multipart template for ${taskType}: ${e.message}. Template: ${populatedString.substring(0, 100)}...`);
                            }
                        } else {
                            throw new Error(`[CustomAdapter] FormData is not available for ${taskType} multipart request`);
                        }
                    } else {
                        data = populatedString;
                    }
                } catch (e: any) {
                    Logger.error(`Failed to parse payload template for ${taskType}:`, e);
                    throw new Error(`Invalid payload template configuration for ${taskType}`);
                }
            }
        }

        if (!url) throw new Error(`No endpoint configured for ${taskType}`);

        try {
            Logger.debug(`[CustomAdapter] ${method} ${url}`, typeof data === 'string' ? data.substring(0, 100) : '[Object Data]');

            const response = await axios({
                method,
                url,
                headers,
                data
            });

            // Map Response
            const mapping = config?.responseMapping;
            if (!mapping) {
                // If no mapping, return raw data or standard OpenAI format fallback (logic below in public methods)
                return response.data;
            }

            const initialResult = {
                text: mapping.text ? resolvePath(response.data, mapping.text) : undefined,
                url: mapping.url ? resolvePath(response.data, mapping.url) : undefined,
                b64: mapping.b64 ? resolvePath(response.data, mapping.b64) : undefined,
                jobId: mapping.jobId ? resolvePath(response.data, mapping.jobId) : undefined,
                raw: response.data
            };

            // === ASYNC POLLING: if we got a jobId and pollConfig is set, poll for the real result ===
            if (initialResult.jobId && config?.pollConfig) {
                Logger.info(`[CustomAdapter] Async job detected: ${initialResult.jobId}. Starting poll...`);
                return await this.pollForResult(String(initialResult.jobId), config.pollConfig, headers);
            }

            return initialResult;

        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message
                || error.response?.data?.detail
                || error.message;
            Logger.error(`CustomAIAdapter Error (${taskType}):`, errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Poll a status endpoint until the job is complete or timeout is reached.
     * Called automatically by executeTask when the initial response contains a jobId
     * and the task config has a pollConfig defined.
     */
    private async pollForResult(jobId: string, pollConfig: IPollConfig, requestHeaders: Record<string, string>): Promise<any> {
        const {
            endpoint,
            method = 'GET',
            headers: pollHeadersRaw,
            intervalMs = 3000,
            timeoutMs = 120000,
            statusPath,
            successValues = ['SUCCESS', 'completed', 'done'],
            failureValues = ['FAILED', 'error', 'failed'],
            responseMapping
        } = pollConfig;

        // Build the poll URL, substituting {{jobId}}
        const pollUrl = fillTemplate(endpoint, { jobId }, false);

        // Merge headers: use request headers as base, then overlay pollConfig-specific headers
        const headers: Record<string, string> = { ...requestHeaders };
        if (pollHeadersRaw) {
            const raw = (typeof pollHeadersRaw === 'string') ? JSON.parse(pollHeadersRaw) : pollHeadersRaw;
            Object.entries(raw).forEach(([k, v]) => {
                if (!k.startsWith('$')) headers[k] = String(v).replace('{{apiKey}}', this.apiKey);
            });
        }

        const deadline = Date.now() + timeoutMs;
        let attempts = 0;

        Logger.info(`[CustomAdapter] Starting poll for jobId=${jobId} → ${pollUrl}`);

        while (Date.now() < deadline) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, intervalMs));

            try {
                const resp = await axios({ method, url: pollUrl, headers });
                const data = resp.data;

                // Resolve status if a path is configured
                const status = statusPath ? resolvePath(data, statusPath) : null;

                Logger.debug(`[CustomAdapter] Poll attempt ${attempts}: jobId=${jobId} status=${status}`);

                // Check for failure
                if (status && failureValues.includes(String(status))) {
                    throw new Error(`Job ${jobId} failed with status: ${status}`);
                }

                // Check for success (by explicit status or absence of statusPath)
                const isDone = !statusPath || (status && successValues.includes(String(status)));

                if (isDone) {
                    Logger.info(`[CustomAdapter] Job ${jobId} completed after ${attempts} attempts.`);
                    // Extract final result using poll responseMapping
                    if (responseMapping) {
                        return {
                            url: responseMapping.url ? resolvePath(data, responseMapping.url) : undefined,
                            b64: responseMapping.b64 ? resolvePath(data, responseMapping.b64) : undefined,
                            text: responseMapping.text ? resolvePath(data, responseMapping.text) : undefined,
                            raw: data
                        };
                    }
                    return { raw: data };
                }

            } catch (pollErr: any) {
                // Re-throw explicit failure errors
                if (pollErr.message?.includes('failed with status')) throw pollErr;
                Logger.warn(`[CustomAdapter] Poll attempt ${attempts} error:`, pollErr.message);
            }
        }

        throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms (${attempts} attempts).`);
    }

    /**
     * Generate text using generic OpenAI-compatible format OR custom config
     */
    async generateText(prompt: string, modelName: string, config: any = {}) {
        // Variables for template
        const variables = {
            prompt,
            model: modelName,
            temperature: config.temperature || 0.7,
            max_tokens: config.maxOutputTokens,
            ...config
        };

        const result = await this.executeTask('text', variables, '/chat/completions', {
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: variables.temperature,
            max_tokens: variables.max_tokens,
        });

        // If we got mapped result
        if (result.text) return { text: result.text };

        // Fallback: OpenAI standard response
        if (result.choices?.[0]?.message?.content) {
            return { text: result.choices[0].message.content };
        }

        // If raw returned and no mapping matched
        if (result.raw) return { text: JSON.stringify(result.raw) }; // Fallback

        return { text: typeof result === 'string' ? result : JSON.stringify(result) };
    }

    /**
     * Generate image using generic OpenAI-compatible format (DALL-E style) OR custom config
     */
    async generateImage(prompt: string, modelName: string, config: any = {}) {
        const variables = {
            prompt,
            model: modelName,
            modelId: modelName, // Alias for better template compatibility
            size: config.size || "1024x1024",
            n: 1,
            aspectRatio: config.aspectRatio || "1:1",
            ...config
        };

        const result = await this.executeTask('image', variables, '/images/generations', {
            model: modelName,
            prompt: prompt,
            n: 1,
            size: variables.size,
            response_format: "b64_json"
        });

        // Mapped result
        if (result.url || result.b64) {
            return {
                media: {
                    url: result.b64 ? `data:image/png;base64,${result.b64}` : result.url
                }
            }
        }

        // Fallback: OpenAI/DALL-E standard
        if (result.data?.[0]) {
            const image = result.data[0];
            return {
                media: {
                    url: image.b64_json ? `data:image/png;base64,${image.b64_json}` : image.url
                }
            };
        }

        throw new Error('Unexpected response format from Image API');
    }

    /**
     * Generate Video (New support)
     */
    async generateVideo(prompt: string, modelName: string, config: any = {}) {
        const variables = {
            prompt,
            model: modelName,
            ...config
        };

        // No standard default for video yet, so we rely heavily on config or assume some generic POST
        const result = await this.executeTask('video', variables, '/video/generations', {
            model: modelName,
            prompt
        });

        return result;
    }

    /**
     * Generate Audio (TTS)
     */
    async generateAudio(prompt: string, modelName: string, config: any = {}) {
        const variables = {
            prompt,
            input: prompt,
            model: modelName,
            voice: config.voice || 'alloy',
            ...config
        };

        const result = await this.executeTask('audio', variables, '/audio/speech', {
            model: modelName,
            input: prompt,
            voice: variables.voice
        });

        // Mapped result
        if (result.url || result.b64) {
            return {
                media: {
                    url: result.b64 ? `data:audio/mpeg;base64,${result.b64}` : result.url
                }
            }
        }

        return result;
    }
}
