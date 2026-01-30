import axios from 'axios';
import { AdminSettings } from '../../models/AdminSettings.js';
import { browserManager } from '../aistudio/BrowserManager.js';
import crypto from 'crypto';

/**
 * FlowApiClient: Direct API-based interaction with Google Labs Flow (Veo & Imagen)
 * Reverse engineered from internal labs endpoints for higher stability.
 */
export class FlowApiClient {
    private readonly LABS_BASE_URL = 'https://labs.google/fx/api';
    private readonly API_BASE_URL = 'https://aisandbox-pa.googleapis.com/v1';
    private readonly RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

    /**
     * Step 1: Get Access Token & Session Info
     * Call https://labs.google/fx/api/auth/session
     */
    async getAccessToken(stToken: string): Promise<{ at: string; expires: string; email: string; raw: any }> {
        console.log('[FlowAPI] Step 1: Validating Session & Obtaining Access Token...');

        // Check if stToken is a full cookie string or just the session token
        const cookieHeader = stToken.includes('__Secure-next-auth.session-token')
            ? stToken
            : `__Secure-next-auth.session-token=${stToken}`;

        const res = await axios.get(`${this.LABS_BASE_URL}/auth/session`, {
            headers: {
                'Cookie': cookieHeader,
                'Accept': '*/*',
                'Origin': 'https://labs.google',
                'Referer': 'https://labs.google/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            }
        });

        if (!res.data.access_token) {
            throw new Error('Flow Session Invalid or Expired (No Access Token returned)');
        }

        return {
            at: res.data.access_token,
            expires: res.data.expires,
            email: res.data.user?.email || 'unknown@google.com',
            raw: res.data
        };
    }

    /**
     * Step 2a: Create Project
     * Call POST https://labs.google/fx/api/trpc/project.createProject
     */
    async createProject(stToken: string, name: string): Promise<string> {
        console.log(`[FlowAPI] Step 2: Creating new project via tRPC: ${name}...`);

        const payload = {
            json: {
                projectTitle: name,
                toolName: "PINHOLE"
            }
        };

        const cookieHeader = stToken.includes('__Secure-next-auth.session-token')
            ? stToken
            : `__Secure-next-auth.session-token=${stToken}`;

        const res = await axios.post(`${this.LABS_BASE_URL}/trpc/project.createProject`, payload, {
            headers: {
                'Cookie': cookieHeader,
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'Origin': 'https://labs.google',
                'Referer': 'https://labs.google/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            }
        });

        const projectId = res.data?.result?.data?.json?.result?.projectId || res.data?.result?.data?.json?.id;
        if (!projectId) throw new Error('Failed to create project: Response missing Project ID');

        console.log(`[FlowAPI] New Project Created: ${projectId}`);
        return projectId;
    }

    /**
     * Step 2b: Validate Project
     * Call GET https://labs.google/fx/api/trpc/project.getProject?input=...
     */
    async validateProject(stToken: string, projectId: string): Promise<boolean> {
        console.log(`[FlowAPI] Step 2: Validating existing project: ${projectId}...`);
        try {
            const input = JSON.stringify({ json: { projectId, toolName: "PINHOLE" } });
            const encodedInput = encodeURIComponent(input);

            const cookieHeader = stToken.includes('__Secure-next-auth.session-token')
                ? stToken
                : `__Secure-next-auth.session-token=${stToken}`;

            const res = await axios.get(`${this.LABS_BASE_URL}/trpc/project.getProject?input=${encodedInput}`, {
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': '*/*',
                    'Origin': 'https://labs.google',
                    'Referer': 'https://labs.google/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
                }
            });

            const confirmedId = res.data?.result?.data?.json?.result?.projectId;
            return !!confirmedId;
        } catch (e: any) {
            console.warn(`[FlowAPI] Project validation failed for ${projectId}:`, e.message);
            return false;
        }
    }

    /**
     * Solve reCAPTCHA v3 using our existing BrowserManager context
     * This injects the grecaptcha.execute script into the Flow project page.
     */
    async solveCaptcha(stToken: string, projectId: string): Promise<string> {
        console.log('[FlowAPI] Solving reCAPTCHA via Headless Browser Bridge...');
        const page = await browserManager.getPage();

        // 0. Enable Browser Console Pipe for Debugging
        page.on('console', msg => {
            const txt = msg.text();
            if (txt.includes('[Browser]') || txt.includes('captcha') || txt.includes('error')) {
                console.log(`[FlowBrowser] ${txt}`);
            }
        });


        // 1. Force Authentication Cookie Inject (Ensures we are logged in)
        const cookiesToInject = [];

        if (stToken.includes(';')) {
            // Parse full raw cookie string
            const rawCookies = stToken.split(';');
            for (const cookieStr of rawCookies) {
                const [name, value] = cookieStr.trim().split('=');
                if (name && value) {
                    cookiesToInject.push({
                        name: name.trim(),
                        value: value.trim(),
                        domain: 'labs.google',
                        path: '/',
                        secure: true,
                        httpOnly: false // Allow JS access for most, though httpOnly is safer, browser context usually handles it
                    });
                }
            }
        } else {
            // Fallback: Just the session token
            cookiesToInject.push({
                name: '__Secure-next-auth.session-token',
                value: stToken,
                domain: 'labs.google',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'Lax' as 'Lax'
            });
        }

        await page.context().addCookies(cookiesToInject);

        // 2. Ensure we are on the project page
        const projectUrl = `https://labs.google/fx/tools/flow/project/${projectId}`;
        if (!page.url().includes(projectId)) {
            console.log(`[FlowAPI] Browser navigating to project: ${projectId}`);
            // Use 'domcontentloaded' to start captcha polling as early as possible
            await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        // 3. Poll for grecaptcha readiness, Inject if missing, and execute
        const token = await page.evaluate(`
            async (siteKey) => {
                console.log('[Browser] Starting reCAPTCHA solve for siteKey:', siteKey);
                
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.warn('[Browser] reCAPTCHA solve timed out after 35s');
                        resolve(null);
                    }, 35000);
                    
                    const injectScript = () => {
                        if (document.querySelector('script[src*="recaptcha"]')) return;
                        console.log('[Browser] Injecting reCAPTCHA script...');
                        const script = document.createElement('script');
                        script.src = 'https://www.google.com/recaptcha/api.js?render=' + siteKey;
                        script.async = true;
                        script.defer = true;
                        document.head.appendChild(script);
                    };

                    const execute = async () => {
                        try {
                            const g = window.grecaptcha;
                            // Prefer Enterprise if available
                            if (g.enterprise && typeof g.enterprise.execute === 'function') {
                                console.log('[Browser] Executing grecaptcha.enterprise.execute...');
                                g.enterprise.ready(async () => {
                                    const t = await g.enterprise.execute(siteKey, { action: 'FLOW_GENERATION' });
                                    console.log('[Browser] Enterprise Token obtained');
                                    clearTimeout(timeout);
                                    resolve(t);
                                });
                            } else {
                                console.log('[Browser] Executing standard grecaptcha.execute...');
                                const t = await g.execute(siteKey, { action: 'FLOW_GENERATION' });
                                console.log('[Browser] Standard Token obtained');
                                clearTimeout(timeout);
                                resolve(t);
                            }
                        } catch (e) {
                            console.error('[Browser] execution error:', e);
                            reject(e);
                        }
                    };

                    const checkReady = (attempts = 0) => {
                        const g = window.grecaptcha;
                        const isReady = g && (typeof g.execute === 'function' || (g.enterprise && typeof g.enterprise.execute === 'function'));
                        
                        if (isReady) {
                            console.log('[Browser] grecaptcha is ready.');
                            execute();
                        } else {
                            if (attempts > 10) injectScript(); // Inject if still not ready after 5s
                            if (attempts < 60) {
                                console.log('[Browser] Waiting for grecaptcha (attempt ' + attempts + ')...');
                                setTimeout(() => checkReady(attempts + 1), 500);
                            } else {
                                console.warn('[Browser] reCAPTCHA never became ready');
                                resolve(null);
                            }
                        }
                    };

                    checkReady();
                });
            }
        `, this.RECAPTCHA_SITE_KEY);

        if (!token) throw new Error('reCAPTCHA solving timed out or failed (Enterprise fallback attempt failed)');
        console.log('[FlowAPI] Captcha Token Obtained Successfully.');
        return token as string;
    }

    async generateVideo(prompt: string, options: {
        at: string;
        projectId: string;
        stToken: string;
        aspectRatio?: 'VIDEO_ASPECT_RATIO_LANDSCAPE' | 'VIDEO_ASPECT_RATIO_PORTRAIT';
        apiKey?: string; // Optional: Use API Key instead of AT
    }): Promise<string> {
        const { at, projectId, aspectRatio = 'VIDEO_ASPECT_RATIO_LANDSCAPE', apiKey } = options;
        const sceneId = crypto.randomUUID();

        // PURE API PAYLOAD: Based on moonai reference (No Recaptcha, No SessionID context needed)
        const payload = {
            clientContext: {
                projectId: projectId,
                tool: 'PINHOLE',
                userPaygateTier: 'PAYGATE_TIER_TWO'
            },
            requests: [{
                aspectRatio: aspectRatio,
                seed: Math.floor(Math.random() * 99999),
                textInput: { prompt },
                videoModelKey: aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE' ? 'veo_3_1_t2v_fast' : 'veo_3_1_t2v_fast_portrait',
                metadata: { sceneId: sceneId }
            }]
        };

        const headers: any = {
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
        };

        if (apiKey) {
            // Priority: Direct API Key
            headers['x-goog-api-key'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`; // Support both variants found in wild
        } else {
            // Fallback: Access Token
            headers['Authorization'] = `Bearer ${at}`;
        }

        console.log(`[FlowAPI] Triggering Video Gen (${apiKey ? 'API-Key Path' : 'OAuth Path'})...`);
        const res = await axios.post(`${this.API_BASE_URL}/video:batchAsyncGenerateVideoText`, payload, { headers });

        const operationName = res.data.operations?.[0]?.operation?.name;
        if (!operationName) throw new Error('Failed to trigger generation: Operation name missing');

        console.log(`[FlowAPI] Generation Started. OperationID: ${operationName}`);
        return operationName;
    }

    /**
     * Trigger Image Generation (Imagen 3.5)
     */
    async generateImage(prompt: string, options: {
        at: string;
        projectId: string;
        stToken: string;
        aspectRatio?: 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_PORTRAIT';
        apiKey?: string;
    }): Promise<string> {
        const { at, projectId, aspectRatio = 'IMAGE_ASPECT_RATIO_LANDSCAPE', apiKey } = options;

        const payload = {
            requests: [{
                clientContext: {
                    projectId: projectId,
                    tool: 'PINHOLE'
                },
                seed: Math.floor(Math.random() * 99999),
                imageModelName: 'IMAGEN_3_5',
                imageAspectRatio: aspectRatio,
                prompt: prompt,
                imageInputs: []
            }]
        };

        const headers: any = {
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
        };

        if (apiKey) {
            headers['x-goog-api-key'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            headers['Authorization'] = `Bearer ${at}`;
        }

        const res = await axios.post(`${this.API_BASE_URL}/projects/${projectId}/flowMedia:batchGenerateImages`, payload, { headers });

        const imageUrl = res.data.media?.[0]?.image?.generatedImage?.fifeUrl;
        if (!imageUrl) throw new Error('Failed to generate image: URL missing in response');

        console.log('[FlowAPI] Image Generated Successfully.');
        return imageUrl;
    }

    /**
     * Check Operation Status
     */
    async checkStatus(at: string, operationName: string, stToken: string): Promise<{ status: string; url?: string }> {
        const payload = {
            operations: [{
                operation: { name: operationName }
            }]
        };

        const res = await axios.post(`${this.API_BASE_URL}/video:batchCheckAsyncVideoGenerationStatus`, payload, {
            headers: {
                'Authorization': `Bearer ${at}`,
                'Content-Type': 'application/json',
                'Origin': 'https://labs.google',
                'Referer': 'https://labs.google/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            }
        });

        const op = res.data.operations?.[0];
        const status = op?.status;

        if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
            const videoUrl = op.operation?.metadata?.video?.generatedVideo?.fifeUrl;
            return { status, url: videoUrl };
        }

        return { status };
    }
}

export const flowApiClient = new FlowApiClient();
