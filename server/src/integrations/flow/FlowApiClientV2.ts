import axios from 'axios';
import crypto from 'crypto';

/**
 * FlowApiClientV2: Advanced client for Google Labs / Antigravity
 * Refined based on antigravity2api-nodejs:
 * - Uses nested wrapper (project, requestId, model, requestType, userAgent)
 * - Optimized for Agent-based endpoints
 * @deprecated Use FlowApiClient instead.
 */
export class FlowApiClientV2 {
    private readonly API_BASE_URL = 'https://aisandbox-pa.googleapis.com/v1';

    /**
     * Generate 128-bit internal request ID (Technique from antigravity2api-nodejs)
     */
    private generateRequestId(): string {
        return crypto.randomUUID();
    }

    /**
     * Common headers for all aisandbox-pa calls
     */
    private getHeaders(at: string, apiKey?: string) {
        const headers: any = {
            'Authorization': `Bearer ${at}`,
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/',
            'User-Agent': 'antigravity' // Identifying as antigravity agent
        };

        if (apiKey) {
            headers['x-goog-api-key'] = apiKey;
        }

        return headers;
    }

    /**
     * Generate Image (Refined Wrapper)
     */
    async generateImage(prompt: string, at: string, projectId: string, options: {
        aspectRatio?: string,
        apiKey?: string,
        recaptchaToken?: string
    } = {}): Promise<string> {
        const { aspectRatio = 'IMAGE_ASPECT_RATIO_SQUARE', apiKey, recaptchaToken = "" } = options;

        // Unified URL Pattern
        const url = `${this.API_BASE_URL}/projects/${projectId}/agent:generateContent`;

        // ANTIGRAVITY WRAPPER STRUCTURE (Matched exactly to repo)
        const requestBody = {
            project: projectId,
            requestId: this.generateRequestId(),
            request: {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    candidateCount: 1,
                    imageConfig: {
                        imageSize: "1K" // Maps to standard generation
                    }
                },
                sessionId: `;${Date.now()}`,
                recaptchaToken: recaptchaToken || undefined
            },
            model: 'gemini-3-pro-image', // High precision image model name from repo
            userAgent: 'antigravity',
            requestType: 'image_gen'
        };

        console.log('[FlowV2] Triggering specialized Image generation...');
        const res = await axios.post(url, requestBody, { headers: this.getHeaders(at, apiKey) });

        // Handle Antigravity-style response nesting
        const part = res.data.response?.candidates?.[0]?.content?.parts?.[0];
        const imageUrl = part?.inlineData?.data || part?.fileData?.fileUri || part?.text; // Flexible extraction

        if (!imageUrl) {
            // Fallback to flowMedia structure if agent path is blocked or redirected
            console.warn('[FlowV2] Agent path returned no direct image. Checking candidates...');
            throw new Error('Image Generation path yielded no media data.');
        }

        return imageUrl;
    }

    /**
     * Trigger Video Generation (Refined Wrapper)
     */
    async generateVideo(prompt: string, at: string, projectId: string, options: {
        aspectRatio?: string,
        modelKey?: string,
        apiKey?: string,
        recaptchaToken?: string
    } = {}): Promise<{ operationName: string; sceneId: string }> {
        const {
            aspectRatio = 'VIDEO_ASPECT_RATIO_LANDSCAPE',
            modelKey = 'veo_3_1_t2v_fast_ultra_fl_relaxed',
            apiKey,
            recaptchaToken = ""
        } = options;

        const url = `${this.API_BASE_URL}/video:batchAsyncGenerateVideoText`;
        const sceneId = `scene_${Date.now()}`;

        const payload = {
            clientContext: {
                projectId: projectId,
                tool: 'PINHOLE',
                userPaygateTier: 'PAYGATE_TIER_TWO',
                recaptchaToken: recaptchaToken || undefined
            },
            requests: [{
                aspectRatio: aspectRatio,
                seed: Math.floor(Math.random() * 1000000),
                textInput: { prompt },
                videoModelKey: modelKey,
                metadata: { sceneId: sceneId }
            }]
        };

        const res = await axios.post(url, payload, { headers: this.getHeaders(at, apiKey) });

        const operationName = res.data.operations?.[0]?.operation?.name;
        if (!operationName) throw new Error('Video Trigger failed: No Operation Name returned');

        return { operationName, sceneId };
    }

    /**
     * Check Video Status (Polling)
     */
    async checkVideoStatus(operationName: string, sceneId: string, at: string, apiKey?: string): Promise<{ status: string; url?: string }> {
        const url = `${this.API_BASE_URL}/video:batchCheckAsyncVideoGenerationStatus`;

        const payload = {
            operations: [{
                operation: { name: operationName },
                sceneId: sceneId,
                status: "MEDIA_GENERATION_STATUS_ACTIVE"
            }]
        };

        const res = await axios.post(url, payload, { headers: this.getHeaders(at, apiKey) });
        const op = res.data.operations?.[0];

        if (!op) return { status: 'UNKNOWN' };

        if (op.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
            const videoUrl = op.operation?.metadata?.video?.generatedVideo?.fifeUrl ||
                op.operation?.metadata?.video?.fifeUrl;
            return { status: op.status, url: videoUrl };
        }

        if (op.status === 'MEDIA_GENERATION_STATUS_FAILED') {
            const errorMsg = op.error?.message || 'Internal Server Error';
            throw new Error(`Video generation failed: ${errorMsg}`);
        }

        return { status: op.status };
    }
}

export const flowApiClientV2 = new FlowApiClientV2();
