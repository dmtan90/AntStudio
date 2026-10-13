import axios from 'axios';
import { chromium, BrowserContext, Browser } from 'playwright';
import { getAdminSettings } from '~/models/AdminSettings.js';
import { Logger } from '~/utils/Logger.js';
import { FLOW_ORIGIN, FLOW_RECAPTCHA_SITE_KEY, FLOW_DEFAULT_USER_AGENT } from './providers/FlowFrontendClient.js';

export type CaptchaMode = 'yescaptcha' | 'capsolver' | 'capmonster' | 'ezcaptcha' | 'browser' | 'personal' | 'remote_browser';

export interface CaptchaSolveOptions {
    projectId: string;
    action: 'IMAGE_GENERATION' | 'VIDEO_GENERATION' | 'UPLOAD_IMAGE' | '';
    tokenId?: string;
    /** User-Agent of the Flow requests that will carry the token; the solver must match it */
    userAgent?: string;
}

/** reCAPTCHA is solved against the Flow project page on flow.google.com (Labs URLs are retired) */
const projectPageUrl = (projectId: string) => `${FLOW_ORIGIN}/project/${projectId}`;

export class CaptchaService {
    private static instance: CaptchaService;
    private websiteKey = FLOW_RECAPTCHA_SITE_KEY;

    private constructor() {}

    public static getInstance(): CaptchaService {
        if (!CaptchaService.instance) {
            CaptchaService.instance = new CaptchaService();
        }
        return CaptchaService.instance;
    }

    public async solve(options: CaptchaSolveOptions): Promise<string | null> {
        const settings = await getAdminSettings();
        const config = settings.apiConfigs.captcha;

        if (!config) {
            Logger.warn('[CaptchaService] Captcha not configured');
            return null;
        }

        switch (config.method) {
            case 'yescaptcha':
                return this.solveExternalService(options, config.yescaptcha, 'RecaptchaV3TaskProxylessM1');
            case 'capsolver':
                // Flow uses reCAPTCHA Enterprise
                return this.solveExternalService(options, config.yescaptcha, 'ReCaptchaV3EnterpriseTaskProxyless');
            case 'capmonster':
            case 'ezcaptcha':
                return this.solveExternalService(options, config.yescaptcha, 'ReCaptchaV3TaskProxyless');
            case 'remote_browser':
                return this.solveRemoteBrowser(options, config.remoteBrowser);
            case 'browser':
                return this.solveLocalBrowser(options, config.localBrowser, 'playwright');
            case 'personal':
                return this.solveLocalBrowser(options, config.localBrowser, 'stealth');
            default:
                Logger.error(`[CaptchaService] Unsupported method: ${config.method}`);
                return null;
        }
    }

    private async solveExternalService(
        options: CaptchaSolveOptions, 
        config?: { apiKey: string; baseUrl: string },
        taskType: string = 'RecaptchaV3TaskProxylessM1'
    ): Promise<string | null> {
        if (!config?.apiKey) {
            Logger.error('[CaptchaService] External service API key not configured');
            return null;
        }

        const baseUrl = (config.baseUrl || 'https://api.yescaptcha.com').replace(/\/$/, '');
        const projectUrl = projectPageUrl(options.projectId);

        try {
            const createResponse = await axios.post(`${baseUrl}/createTask`, {
                clientKey: config.apiKey,
                task: {
                    type: taskType,
                    websiteURL: projectUrl,
                    websiteKey: this.websiteKey,
                    pageAction: options.action || '',
                    ...(options.userAgent ? { userAgent: options.userAgent } : {})
                }
            });

            const taskId = createResponse.data.taskId;
            if (!taskId) {
                Logger.error(`[CaptchaService] Task creation failed: ${JSON.stringify(createResponse.data)}`);
                return null;
            }

            // Polling for result
            for (let i = 0; i < 40; i++) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const resultResponse = await axios.post(`${baseUrl}/getTaskResult`, {
                    clientKey: config.apiKey,
                    taskId: taskId
                });

                const status = resultResponse.data.status;
                if (status === 'ready') {
                    // Logger.info(`[CaptchaService] Task ready: ${JSON.stringify(resultResponse.data)}`);
                    return resultResponse.data.solution.gRecaptchaResponse;
                }
                if (status === 'processing') continue;
                
                Logger.error(`[CaptchaService] Task failed: ${JSON.stringify(resultResponse.data)}`);
                return null;
            }

            Logger.error('[CaptchaService] Task timeout');
            return null;
        } catch (error) {
            Logger.error(`[CaptchaService] External service error: ${error}`);
            return null;
        }
    }

    private async solveRemoteBrowser(options: CaptchaSolveOptions, config?: { apiKey: string; baseUrl: string; timeout: number }): Promise<string | null> {
        if (!config?.apiKey || !config?.baseUrl) {
            Logger.error('[CaptchaService] Remote Browser not configured');
            return null;
        }

        try {
            const response = await axios.post(`${config.baseUrl}/api/v1/solve`, {
                project_id: options.projectId,
                action: options.action,
                token_id: options.tokenId
            }, {
                headers: { Authorization: `Bearer ${config.apiKey}` },
                timeout: (config.timeout || 60) * 1000
            });

            return response.data.token;
        } catch (error) {
            Logger.error(`[CaptchaService] Remote Browser error: ${error}`);
            return null;
        }
    }

    private async solveLocalBrowser(options: CaptchaSolveOptions, config: any, type: 'playwright' | 'stealth'): Promise<string | null> {
        Logger.info(`[CaptchaService] Attempting local browser solve (${type}) for project ${options.projectId}`);
        
        let browser: Browser | null = null;
        let context: BrowserContext | null = null;
        
        try {
            const projectUrl = projectPageUrl(options.projectId);
            const isHeadless = type === 'playwright'; // Playwright mode is usually headless for server use
            // Same User-Agent as the Flow requests, or Google scores the token as unusual activity
            const userAgent = options.userAgent || FLOW_DEFAULT_USER_AGENT;

            if (config?.profileDir && type === 'stealth') {
                context = await chromium.launchPersistentContext(config.profileDir, {
                    headless: false, // Personal mode might need UI for first time or debugging, but usually false for automation
                    userAgent,
                });
            } else {
                browser = await chromium.launch({ headless: isHeadless });
                context = await browser.newContext({ userAgent });
            }

            const page = await context.newPage();
            await page.goto(projectUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Inject script to wait for grecaptcha and execute it
            const token = await page.evaluate(async (params) => {
                return new Promise<string>((resolve, reject) => {
                    const checkInterval = setInterval(() => {
                        if ((window as any).grecaptcha && (window as any).grecaptcha.execute) {
                            clearInterval(checkInterval);
                            (window as any).grecaptcha.execute(params.websiteKey, { action: params.action })
                                .then(resolve)
                                .catch(reject);
                        }
                    }, 500);
                    
                    // Timeout after 15s
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        reject(new Error('reCAPTCHA execution timeout'));
                    }, 15000);
                });
            }, { websiteKey: this.websiteKey, action: options.action });

            return token;
        } catch (error: any) {
            Logger.error(`[CaptchaService] Local browser solve failed: ${error.message}`);
            return null;
        } finally {
            if (browser) await browser.close();
            else if (context) await context.close();
        }
    }
}

export const captchaService = CaptchaService.getInstance();
