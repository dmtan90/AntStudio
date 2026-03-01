import { Page } from 'playwright';
import { browserManager } from '../aistudio/BrowserManager.js';
import { AdminSettings } from '../../models/AdminSettings.js';
import { flowApiClient } from './FlowApiClient.js';
import { Logger } from '../../utils/Logger.js';

export class FlowClient {
    private isReady = false;

    constructor() { }

    public getReadyStatus() {
        return this.isReady || browserManager.hasSession();
    }

    /**
     * Inject cookies from an external source (e.g. Database)
     */
    async injectCookies(cookies: any[]) {
        Logger.info(`[Flow] Injecting ${cookies.length} cookies...`);
        const page = await browserManager.getPage();
        const context = page.context();

        // 1. Inject specialized Flow token if found in DB
        const settings = await AdminSettings.findOne();
        if (settings?.aiSettings?.flowSessionToken) {
            Logger.info('[Flow] Injecting dedicated next-auth session token...');
            await context.addCookies([{
                name: '__Secure-next-auth.session-token',
                value: settings.aiSettings.flowSessionToken,
                domain: 'labs.google',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'Lax'
            }]);
        }

        // 2. Inject standard cookies
        await context.addCookies(cookies);
    }

    private async saveCookiesToDB(cookies: any[]) {
        try {
            const settings = await AdminSettings.findOne();
            if (settings) {
                let updated = false;

                // 1. Detect and save Flow session token
                const flowToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
                if (flowToken) {
                    settings.aiSettings.flowSessionToken = flowToken.value;
                    updated = true;
                    Logger.info('[Flow] Dedicated session token detected and persisted.');
                }

                // 2. Save common Google session symbols to 'aistudio' shared pool
                const googleProvider = settings.aiSettings.providers.find(p => p.id === 'aistudio');
                if (googleProvider) {
                    googleProvider.apiKey = JSON.stringify(cookies);
                    settings.markModified('aiSettings.providers');
                    updated = true;
                    Logger.info('[Flow] Standard cookies persisted to shared storage (aistudio).');
                }

                if (updated) {
                    await settings.save();
                }
            }
        } catch (e: any) {
            Logger.error('[Flow] Failed to save cookies to DB:', 'FlowClient', e.message);
        }
    }

    private async saveWorkspaceUrlToDB(url: string) {
        try {
            const settings = await AdminSettings.findOne();
            if (settings) {
                if (!settings.aiSettings.flowWorkspaceUrls) settings.aiSettings.flowWorkspaceUrls = [];
                if (!settings.aiSettings.flowWorkspaceUrls.includes(url)) {
                    settings.aiSettings.flowWorkspaceUrls.push(url);
                    // Keep the pool clean (max 20 as suggested)
                    if (settings.aiSettings.flowWorkspaceUrls.length > 20) {
                        settings.aiSettings.flowWorkspaceUrls.shift();
                    }
                    await settings.save();
                    Logger.info(`[Flow] Workspace URL persisted: ${url}`);
                }
            }
        } catch (e: any) {
            Logger.error('[Flow] Failed to save workspace URL:', 'FlowClient', e.message);
        }
    }

    async init() {
        const page = await browserManager.getPage();
        try {
            // 1. Load configuration and check Pool
            const settings = await AdminSettings.findOne();
            const pool = settings?.aiSettings?.flowWorkspaceUrls || [];

            let targetUrl = 'https://labs.google/fx/vi/tools/flow';
            if (pool.length > 0) {
                // Pick the most recent one (last in list)
                targetUrl = pool[pool.length - 1];
                Logger.info(`[Flow] Using existing workspace from pool: ${targetUrl}`);
            }

            // 2. Navigation
            Logger.info(`[Flow] Navigating to: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

            // 3. Project Creation & Redirection Logic
            let currentUrl = page.url();
            let isInWorkspace = currentUrl.includes('/project/');

            if (!isInWorkspace && currentUrl.includes('/tools/flow')) {
                Logger.info('[Flow] Not in workspace. Starting project creation cycle...');

                let retryCount = 0;
                while (retryCount < 2 && !isInWorkspace) {
                    try {
                        Logger.info(`[Flow] Attempting to click "Dự án mới" (Attempt ${retryCount + 1}/2)...`);

                        // Strategy 1: Targeted class + broad text
                        const btn = page.locator('button.sc-c177465c-1, button').filter({ hasText: /Dự án mới|New project/i }).first();

                        if (await btn.isVisible({ timeout: 5000 })) {
                            await btn.click({ force: true });
                        } else {
                            // Strategy 2: Icon search 'add_2'
                            const iconBtn = page.locator('button:has(i:has-text("add_2")), button:has(.google-symbols)').first();
                            if (await iconBtn.isVisible({ timeout: 2000 })) {
                                Logger.info('[Flow] Found button by icon "add_2".');
                                await iconBtn.click({ force: true });
                            } else {
                                // Strategy 3: Pure text search
                                Logger.info('[Flow] Generic text search fallback...');
                                await page.click('text="Dự án mới"', { timeout: 2000 }).catch(() => { });
                            }
                        }

                        // Wait for navigation and URL change
                        Logger.info('[Flow] Waiting for project redirection...');
                        await page.waitForURL(url => url.toString().includes('/project/'), { timeout: 15000 }).catch(() => { });

                        currentUrl = page.url();
                        isInWorkspace = currentUrl.includes('/project/');
                    } catch (e: any) {
                        Logger.warn(`[Flow] Navigation attempt failed: ${e.message}`, 'FlowClient');
                    }
                    retryCount++;
                }
            }

            // 4. Persistence & Final State Check
            if (isInWorkspace) {
                await this.saveWorkspaceUrlToDB(page.url());
                Logger.info(`[Flow] Flow Workspace Ready: ${page.url()}`);
                this.isReady = true;
            } else {
                Logger.warn('[Flow] Still in Lobby. Marking as NOT READY.', 'FlowClient');
                this.isReady = false;
            }
        } catch (error: any) {
            Logger.error('[Flow] Initialization Failed:', 'FlowClient', error.message);
            this.isReady = false;
        }
    }

    private async selectTab(type: 'video' | 'image') {
        const page = await browserManager.getPage();
        const tabText = type === 'video' ? 'Video' : 'Hình ảnh';

        // Strategy: Filter by role radio and name, matching provided HTML
        const tabLocator = page.locator('button[role="radio"]').filter({ hasText: new RegExp(`^${tabText}$`, 'i') });

        try {
            if (await tabLocator.isVisible({ timeout: 10000 })) {
                const isSelected = await tabLocator.evaluate((el) => {
                    return el.getAttribute('aria-checked') === 'true' || el.getAttribute('data-state') === 'on';
                });

                if (!isSelected) {
                    Logger.info(`[Flow] Switching to tab: ${tabText}`);
                    await tabLocator.click();
                    await page.waitForTimeout(2000);
                } else {
                    Logger.info(`[Flow] Tab "${tabText}" is already active.`);
                }
            } else {
                Logger.warn(`[Flow] Tab button "${tabText}" not visible via Role. Trying fallback text...`, 'FlowClient');
                // Fallback to generic button search
                const fallback = page.locator('button').filter({ hasText: new RegExp(`^${tabText}$`, 'i') }).first();
                if (await fallback.isVisible()) {
                    await fallback.click();
                    await page.waitForTimeout(2000);
                }
            }
        } catch (e) {
            Logger.warn(`[Flow] Could not find or click tab: ${tabText}`, 'FlowClient');
        }
    }

    private async ensureFlowPage() {
        const page = await browserManager.getPage();
        const currentUrl = page.url();
        const isInWorkspace = currentUrl.includes('/project/');

        if (currentUrl.includes('/tools/flow') && isInWorkspace) return;

        Logger.info('[Flow] Not in project workspace. Re-navigating to Flow tools...');
        if (!currentUrl.includes('/tools/flow')) {
            await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' }).catch(() => { });
        }
        await this.init();
    }

    /**
     * Internal: Orchestrate the 3-Step API Pipeline
     * Step 1: Session Validation & Access Token
     * Step 2: Project Validation or Creation
     */
    private async ensureApiContext() {
        const settings = await AdminSettings.findOne();
        const stToken = settings?.aiSettings?.flowSessionToken;
        if (!stToken) throw new Error("Missing Flow Session Token in Admin Settings");

        // Step 1: Session & Token Exchange
        const { at } = await flowApiClient.getAccessToken(stToken);

        // Step 2: Project Management
        let projectId = settings?.aiSettings?.flowWorkspaceUrls?.slice(-1)[0]?.split('/project/')?.[1];
        let needsNewProject = !projectId;

        if (projectId) {
            const isValid = await flowApiClient.validateProject(stToken, projectId);
            if (!isValid) {
                Logger.info(`[Flow] Project ${projectId} is invalid or deleted. Will create a new one.`);
                needsNewProject = true;
            }
        }

        if (needsNewProject) {
            projectId = await flowApiClient.createProject(stToken, `AntStudio_Workspace_${Date.now()}`);
            await this.saveWorkspaceUrlToDB(`https://labs.google/fx/vi/tools/flow/project/${projectId}`);
        }

        this.isReady = true;
        return { at, stToken, projectId: projectId! };
    }

    /**
     * Generate Video using Flow (Refined API Path)
     */
    async generateVideo(prompt: string): Promise<string> {
        Logger.info('[Flow] Triggering Video Generation (Veo 3.1)...');

        // 1. Fetch Priority Config (Gemini API Key from Env or Google Provider)
        const settings = await AdminSettings.findOne();
        const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        const providerKey = settings?.aiSettings?.providers?.find(p => p.id === 'google' && p.isActive)?.apiKey;
        const legacyKey = settings?.geminiApiKeys?.find(k => k.isActive)?.key;

        const geminiKey = envKey || providerKey || legacyKey;

        // 2. Path A: Direct API (Priority - Hybrid Zero Browser Path)
        try {
            const { at, stToken, projectId } = await this.ensureApiContext();

            Logger.info(`[Flow] Switching to API Path (Project: ${projectId})`);

            const startGen = async (useApiKey: boolean) => {
                return await flowApiClient.generateVideo(prompt, {
                    at, projectId, stToken,
                    apiKey: useApiKey ? geminiKey : undefined,
                    aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
                });
            };

            let operationName = "";
            try {
                // HAPPY PATH: Try with API Key first (If available) or Pure API (No Captcha)
                if (geminiKey) {
                    Logger.info('[Flow] Attempting API-Key driven generation (No Captcha needed)...');
                    operationName = await startGen(true);
                } else {
                    Logger.info('[Flow] No API Key found. Attempting Pure API generation (No Captcha attempt)...');
                    operationName = await startGen(false);
                }
            } catch (err: any) {
                const msg = (err.response?.data?.error?.message || err.message || "").toLowerCase();
                if (msg.includes('recaptcha') || msg.includes('challenge') || msg.includes('security') || msg.includes('blocked') || err.response?.status === 403 || err.response?.status === 401) {
                    // Only fallback to captcha solving if we AREN'T already using an API Key (which should bypass it)
                    // Or if even the API Key is challenged.
                    Logger.info(`[Flow] API security challenge detected (${err.response?.status || 'Unknown Status'}). Invoking background solver...`);

                    let rt = "";
                    try {
                        rt = await flowApiClient.solveCaptcha(stToken, projectId);
                    } catch (captchaErr: any) {
                        throw new Error(`Captcha solver failed: ${captchaErr.message}`);
                    }

                    operationName = await flowApiClient.generateVideo(prompt, {
                        at, projectId, stToken,
                        aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
                    }); // Note: internal generateVideo now omits captcha in payload by default
                } else {
                    throw err; // Real error
                }
            }

            Logger.info(`[Flow] API Generation started: ${operationName}. Polling status...`);
            let attempts = 0;
            while (attempts < 60) {
                const { status, url } = await flowApiClient.checkStatus(at, operationName, stToken);
                if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
                    Logger.info(`[Flow] API Generation Success: ${url}`);
                    return url || '';
                }
                if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
                    throw new Error('API Generation marked as failed by Google (Safety filter or technical error)');
                }
                await new Promise(r => setTimeout(r, 10000));
                attempts++;
            }
            throw new Error('API Generation timed out');
        } catch (apiErr: any) {
            Logger.warn(`[Flow] API Mode failed: ${apiErr.message}. Falling back to Browser Mode...`, 'FlowClient');
        }

        // 2. Path B: Browser Fallback
        if (!this.isReady) await this.init();
        await this.ensureFlowPage();
        await this.selectTab('video');
        const page = await browserManager.getPage();

        try {
            Logger.info('[Flow] Starting deep discovery of input box...');
            let inputLocator = null;
            const idLocator = page.locator('textarea#PINHOLE_TEXT_AREA_ELEMENT_ID');
            if (await idLocator.isVisible({ timeout: 2000 })) {
                inputLocator = idLocator;
            }

            if (!inputLocator) {
                const targetPlaceholders = ['Tạo một video bằng văn bản…', 'Nhập vào ô nhập câu lệnh để bắt đầu', 'Tạo một video bằng văn bản...', 'Bắt đầu bằng cách nhập câu lệnh'];
                for (const text of targetPlaceholders) {
                    const loc = page.getByPlaceholder(text, { exact: false }).first();
                    if (await loc.isVisible({ timeout: 1000 })) {
                        inputLocator = loc;
                        break;
                    }
                }
            }

            if (inputLocator) {
                await inputLocator.click({ force: true });
                await page.waitForTimeout(500);
                await inputLocator.press('Control+A');
                await inputLocator.press('Backspace');
                await inputLocator.fill(prompt);
            } else {
                Logger.info('[Flow] Blind input strategy...');
                const size = page.viewportSize();
                if (size) await page.mouse.click(size.width / 2, size.height - 80);
                await page.keyboard.type(prompt, { delay: 30 });
            }

            await page.keyboard.press('Control+Enter');
            const btns = page.locator('button:has(svg), button[aria-label*="Gửi"], button[aria-label*="Send"], button:has-text("Chạy")');
            const btnCount = await btns.count();
            for (let i = 0; i < btnCount; i++) {
                if (await btns.nth(i).isVisible()) {
                    await btns.nth(i).click().catch(() => { });
                    break;
                }
            }

            await page.waitForSelector('[role="progressbar"], .loading, .generating', { state: 'detached', timeout: 480000 });
            await page.waitForTimeout(5000);

            const mediaResult = await page.evaluate(async () => {
                const videos = Array.from(document.querySelectorAll('video'));
                const links = Array.from(document.querySelectorAll('a[href*="googleusercontent.com"], a[href^="blob:"]'));
                let url = null;

                const workspaceVideos = videos.filter(v => {
                    const rect = v.getBoundingClientRect();
                    return rect.top >= window.innerHeight * 0.2 && !(v.muted && v.loop) && rect.width >= 100 && rect.height >= 100;
                });

                if (workspaceVideos.length > 0) {
                    for (let i = workspaceVideos.length - 1; i >= 0; i--) {
                        const v = workspaceVideos[i];
                        if (v.src && (v.src.startsWith('blob:') || v.src.includes('googleusercontent.com'))) {
                            url = v.src;
                            break;
                        }
                    }
                }

                if (!url && links.length > 0) {
                    url = (links[links.length - 1] as HTMLAnchorElement).href;
                }

                if (url?.startsWith('blob:')) {
                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) { return url; }
                }
                return url;
            });

            if (!mediaResult) throw new Error('Generation finished but no media found in UI.');
            return mediaResult as string;
        } catch (error: any) {
            Logger.error('[Flow] Video Gen (Browser) Error:', 'FlowClient', error.message);
            throw error;
        }
    }

    /**
     * Generate Image using Flow
     */
    async generateImage(prompt: string): Promise<string> {
        Logger.info('[Flow] Triggering Image Generation (Imagen 3.5)...');

        // 1. Fetch Priority Config
        const settings = await AdminSettings.findOne();
        const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        const providerKey = settings?.aiSettings?.providers?.find(p => p.id === 'google' && p.isActive)?.apiKey;
        const legacyKey = settings?.geminiApiKeys?.find(k => k.isActive)?.key;

        const geminiKey = envKey || providerKey || legacyKey;

        // 2. Path A: Direct API (Hybrid Zero Browser Path)
        try {
            const { at, stToken, projectId } = await this.ensureApiContext();

            Logger.info(`[Flow] Switching to Image API Path (Project: ${projectId})`);
            try {
                if (geminiKey) {
                    Logger.info('[Flow] Attempting API-Key driven image generation...');
                    return await flowApiClient.generateImage(prompt, {
                        at, projectId, stToken, apiKey: geminiKey,
                        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
                    });
                } else {
                    Logger.info('[Flow] Attempting Pure API Image generation...');
                    return await flowApiClient.generateImage(prompt, {
                        at, projectId, stToken,
                        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
                    });
                }
            } catch (err: any) {
                const msg = (err.response?.data?.error?.message || err.message || "").toLowerCase();
                if (msg.includes('recaptcha') || msg.includes('challenge') || msg.includes('security') || msg.includes('blocked') || err.response?.status === 403 || err.response?.status === 401) {
                    Logger.info(`[Flow] Image API challenge detected (${err.response?.status || 'Unknown Status'}). Falling back to solver...`);

                    const rToken = await flowApiClient.solveCaptcha(stToken, projectId);
                    return await flowApiClient.generateImage(prompt, {
                        at, projectId, stToken,
                        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
                    });
                } else {
                    throw err;
                }
            }
        } catch (apiErr: any) {
            Logger.warn(`[Flow] Image API Mode failed: ${apiErr.message}. Falling back to Browser Mode...`, 'FlowClient');
        }

        // 2. Path B: Browser Fallback
        if (!this.isReady) await this.init();
        await this.ensureFlowPage();
        await this.selectTab('image');
        const page = await browserManager.getPage();

        try {
            Logger.info('[Flow] Starting deep discovery of image input box...');
            let inputLocator = null;
            const targetPlaceholders = ['Tạo hình ảnh từ văn bản và thành phần', 'Nhập vào ô nhập câu lệnh để bắt đầu', 'Tạo một hình ảnh bằng văn bản...', 'Bắt đầu bằng cách nhập câu lệnh'];
            for (const text of targetPlaceholders) {
                const loc = page.getByPlaceholder(text, { exact: false }).first();
                if (await loc.isVisible({ timeout: 1000 })) {
                    inputLocator = loc;
                    break;
                }
            }

            if (inputLocator) {
                await inputLocator.click({ force: true });
                await inputLocator.fill(prompt);
            } else {
                const size = page.viewportSize();
                if (size) await page.mouse.click(size.width / 2, size.height - 80);
                await page.keyboard.type(prompt, { delay: 30 });
            }

            await page.keyboard.press('Control+Enter');
            await page.waitForTimeout(10000);

            const imageUrl = await page.evaluate(async () => {
                const imgs = Array.from(document.querySelectorAll('img[src*="googleusercontent.com"], img[src^="blob:"]'));
                if (imgs.length === 0) return null;
                const last = imgs[imgs.length - 1] as HTMLImageElement;
                let url = last.src;

                if (url.startsWith('blob:')) {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                }
                return url;
            });

            if (!imageUrl) throw new Error('Could not extract generated image from Flow UI.');
            return imageUrl as string;
        } catch (error: any) {
            Logger.error('[Flow] Image Gen (Browser) Error:', 'FlowClient', error.message);
            throw error;
        }
    }

    /**
     * Update Cookies from Admin
     */
    async updateCookies(cookies: any[]) {
        const page = await browserManager.getPage();
        const context = page.context();

        const sanitizedCookies = cookies.map((c) => {
            if (!c.name || !c.value) return null;
            const sanitized: any = {
                name: String(c.name),
                value: String(c.value),
                domain: String(c.domain || '.google.com'),
                path: String(c.path || '/'),
                httpOnly: !!c.httpOnly,
                secure: !!c.secure,
            };
            if (sanitized.name.startsWith('__Secure-')) sanitized.secure = true;
            if (sanitized.name.startsWith('__Host-')) {
                sanitized.secure = true;
                sanitized.path = '/';
                delete sanitized.domain;
            }
            if (c.sameSite) {
                const ss = String(c.sameSite).toLowerCase();
                if (ss === 'strict') sanitized.sameSite = 'Strict';
                else if (ss === 'lax') sanitized.sameSite = 'Lax';
                else if (ss === 'none') {
                    sanitized.sameSite = 'None';
                    sanitized.secure = true;
                }
            }
            if (c.expires !== undefined && c.expires !== null) {
                const exp = Number(c.expires);
                if (!isNaN(exp) && exp > 0) sanitized.expires = Math.floor(exp);
            }
            return sanitized;
        }).filter(Boolean);

        Logger.info(`[Flow] Applying ${sanitizedCookies.length} cookies...`);
        try {
            await context.addCookies(sanitizedCookies);
        } catch (e: any) {
            Logger.error('[Flow] addCookies failed:', 'FlowClient', e.message);
        }
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
        this.isReady = true;
        await this.saveCookiesToDB(sanitizedCookies);
    }
}

export const flowClient = new FlowClient();
