import { Page } from 'playwright';
import { browserManager } from './BrowserManager.js';
import { AdminSettings } from '../../models/AdminSettings.js';

export class AIStudioClient {
    private isReady = false;

    constructor() { }

    public getReadyStatus() {
        return this.isReady || browserManager.hasSession();
    }

    /**
     * Inject cookies from an external source (e.g. Database)
     */
    async injectCookies(cookies: any[]) {
        console.log(`[AIStudio] Injecting ${cookies.length} cookies from external source...`);
        const page = await browserManager.getPage();
        const context = page.context();
        await context.addCookies(cookies);
    }

    private async saveCookiesToDB(cookies: any[]) {
        try {
            const settings = await AdminSettings.findOne();
            if (settings) {
                const aistudioProvider = settings.aiSettings.providers.find((p: any) => p.id === 'aistudio');
                if (aistudioProvider) {
                    aistudioProvider.apiKey = JSON.stringify(cookies);
                    // Mark as modified if it's a Map or nested object in some Mongoose versions
                    settings.markModified('aiSettings.providers');
                    await settings.save();
                    console.log('[AIStudio] Cookies persisted to Database.');
                }
            }
        } catch (e) {
            console.error('[AIStudio] Failed to save cookies to DB:', e);
        }
    }

    async init() {
        const page = await browserManager.getPage();
        try {
            // 1. Initial Check: Are we already on a "logged in" URL?
            let currentUrl = page.url();
            if (currentUrl.includes('/app/') || currentUrl.includes('/prompts/')) {
                console.log('[AIStudio] Already on workspace URL. Session likely valid.');
                this.isReady = true;
                return;
            }

            // 2. Navigation & Detection
            console.log('[AIStudio] Navigating to AI Studio Home...');
            await page.goto('https://aistudio.google.com/app/home', { waitUntil: 'domcontentloaded', timeout: 30000 });

            // 3. Robust Login Detection Heuristic
            try {
                // Wait for any of these indicators of a logged-in state
                await Promise.race([
                    page.waitForSelector('text=Create new', { timeout: 15000 }),
                    page.waitForSelector('text=Playground', { timeout: 15000 }),
                    page.waitForSelector('img[src*="googleusercontent.com"]', { timeout: 15000 }), // Profile photo
                    page.waitForURL('**/app/home**', { timeout: 15000 }),
                    page.waitForURL('**/prompts/**', { timeout: 15000 })
                ]);

                console.log('[AIStudio] Session Valid (Detected via UI).');
                this.isReady = true;
            } catch (e) {
                // Check if we are stuck on a login/landing page
                const isLanding = await page.evaluate(() => {
                    const text = document.body.innerText;
                    return text.includes('Sign in') || text.includes('Get started') || text.includes('Terms of Service');
                });

                if (isLanding) {
                    console.log('[AIStudio] Still on Landing/Login page. Cookies might be expired or invalid.');
                } else {
                    console.log('[AIStudio] Could not determine login status, but proceeding with caution.');
                    // Occasionally AI Studio UI is just weird; if we have cookies, we can try to proceed
                    this.isReady = true;
                }
            }
        } catch (error) {
            console.error('[AIStudio] Navigation Failed:', error);
        }
    }

    private async ensureChatPage() {
        const page = await browserManager.getPage();
        const inputSelectors = [
            'div[role="textbox"][contenteditable="true"]',
            'textarea[placeholder*="Type here"]',
            'textarea[placeholder*="Start typing a prompt"]',
            'textarea[placeholder*="Type a prompt"]',
            'textarea[placeholder*="Type your prompt"]',
            'textarea[placeholder*="Describe your video"]',
            'textarea[aria-label*="Prompt"]',
            'textarea[aria-label*="Enter your prompt"]',
            'textarea[aria-label*="Type a message"]',
            'textarea[aria-label*="Enter a prompt"]',
            'textarea[formcontrolname*="promptText"]',
            'ms-prompt-input textarea'
        ];

        // 1. Check if we are already on a chat page with input
        for (const selector of inputSelectors) {
            if (await page.$(selector)) return selector;
        }

        // 2. If not, try to navigate to the new chat URL
        console.log('[AIStudio] Creating new chat session...');
        await page.goto('https://aistudio.google.com/app/prompts/new_chat', { waitUntil: 'domcontentloaded' }).catch(() => { });

        // 3. Wait for any valid input selector
        for (const selector of inputSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });
                return selector;
            } catch (e) { }
        }

        throw new Error('Could not find prompt input box in AI Studio');
    }

    private async selectTool(toolName: string) {
        const page = await browserManager.getPage();

        // 1. Try to find the "+" button
        const addButtons = [
            'button[aria-label*="Add"]',
            'button:has(.google-symbols:has-text("add"))',
            'button:has(svg)',
            '.add-button'
        ];

        let added = false;
        for (const selector of addButtons) {
            if (await page.$(selector)) {
                await page.click(selector);
                added = true;
                break;
            }
        }

        if (!added) {
            // Backup: look for any button that might be the "plus"
            await page.click('ms-prompt-input button:first-child').catch(() => { });
        }

        // 2. Wait for the menu and click the tool
        const toolSelectors = [
            `text="${toolName}"`,
            `span:has-text("${toolName}")`,
            `[role="menuitem"]:has-text("${toolName}")`,
            `.tool-name:has-text("${toolName}")`
        ];

        for (const selector of toolSelectors) {
            try {
                const element = await page.waitForSelector(selector, { timeout: 3000 });
                if (element) {
                    await element.click();
                    return true;
                }
            } catch (e) { }
        }
        return false;
    }

    /**
     * Generate Video using Veo 3.1 / Veo 2
     */
    async generateVideo(prompt: string): Promise<string> {
        if (!this.isReady) await this.init();
        const page = await browserManager.getPage();
        const inputSelector = await this.ensureChatPage();

        // 1. Attempt to use Tool Menu for Veo 3.1
        console.log('[AIStudio] Attempting to use Veo 3.1 tool...');
        const toolSelected = await this.selectTool('Veo 3.1').catch(() => false);

        if (toolSelected) {
            console.log('[AIStudio] Tool selected, sending prompt...');
        } else {
            console.log('[AIStudio] Tool menu not found or item missing, using direct prompt with prefix...');
            await page.click(inputSelector);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type('Generate a video: ');
        }

        console.log('[AIStudio] Found input box. Cleaning and sending prompt...');
        await page.click(inputSelector);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);

        // Use keyboard to ensure events are fired correctly
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(`Generate a video: ${prompt}`);

        // Try Enter first
        await page.keyboard.press('Enter');

        // Then also look for and click the "Run" button as a backup
        const runButtonSelectors = [
            'button:has-text("Run")',
            'button[aria-label*="Run"]',
            'button .run-icon',
            '.run-button'
        ];

        console.log('[AIStudio] Prompt typed. Attempting to trigger generation...');
        for (const selector of runButtonSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn && await btn.isVisible()) {
                    await btn.click();
                    console.log(`[AIStudio] Clicked trigger button: ${selector}`);
                    break;
                }
            } catch (e: any) { }
        }

        console.log('[AIStudio] Waiting for generation indicator...');

        // 3. Wait for Video Result
        // Veo generation takes time. We need to watch for a <video> tag or a specific "Generated" indicator.
        // AIStudio2API often monitors network responses for the download URL.

        // Network Monitoring Strategy (More robust for file retrieval)
        // We look for a response that looks like a video file or a signed url json.

        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                page.off('response', responseListener);
                reject('Timeout waiting for video (5 mins reached)');
            }, 300000); // 5 mins

            let capturedUrl: string | null = null;

            // 3. Network Monitoring Listener
            const responseListener = async (response: any) => {
                const url = response.url();
                const headers = response.headers();
                const contentType = (headers['content-type'] || '').toLowerCase();
                const contentLength = parseInt(headers['content-length'] || '0');

                // Broaden identification criteria
                const isVideoUrl = url.includes('googlevideo.com') ||
                    url.includes('google.com/download') ||
                    url.includes('/video/') ||
                    url.includes('googleusercontent.com/download') ||
                    contentType.includes('video/') ||
                    (contentLength > 1000000 && contentType.includes('application/octet-stream')); // Large files

                if (isVideoUrl) {
                    console.log(`[AIStudio] Potential Video captured [${contentType}, ${contentLength} bytes]:`, url.substring(0, 100));
                    capturedUrl = url;
                }
            };

            page.on('response', responseListener);

            try {
                // Wait for generation to START: 
                // Look for Stop button OR a spinner OR the prompt appearing in the chat
                await Promise.race([
                    page.waitForSelector('button[aria-label*="Stop"]', { timeout: 20000 }),
                    page.waitForSelector('.loading-spinner, ms-progress-bar', { timeout: 20000 }),
                    page.waitForSelector('ms-content-view', { timeout: 20000 })
                ]).catch(() => {
                    console.log('[AIStudio] Warning: Traditional generation indicators not seen, but waiting for result anyway.');
                });

                console.log('[AIStudio] Waiting for generation to COMPLETE (Stop/Loading to vanish)...');
                await Promise.all([
                    page.waitForSelector('button[aria-label*="Stop"]', { state: 'detached', timeout: 300000 }).catch(() => { }),
                    page.waitForSelector('.loading-spinner, ms-progress-bar', { state: 'detached', timeout: 300000 }).catch(() => { })
                ]);

                // Small grace period for UI to settle
                await new Promise(r => setTimeout(r, 3000));

                // 5. Error/Safety Detection
                const refusalText = await page.evaluate(() => {
                    const text = document.body.innerText;
                    const errorPhrases = [
                        "can't help with that",
                        "safety policy",
                        "cannot fulfill",
                        "an error occurred",
                        "invalid request",
                        "quota exceeded"
                    ];
                    return errorPhrases.find(p => text.toLowerCase().includes(p));
                });

                if (refusalText) {
                    console.warn(`[AIStudio] Potential refusal or error detected: "${refusalText}"`);
                }

                // 6. Final UI Check
                console.log('[AIStudio] Performing final UI sweep for video elements...');
                const uiVideoUrlResult = await page.evaluate(`(() => {
                    console.log('[AIStudio Debug] Starting video extraction from UI...');

                    // Helper: Check if element is likely navigation/header
                    const isNav = (el: any) => {
                        const className = el.className?.toLowerCase() || '';
                        const id = el.id?.toLowerCase() || '';
                        const tagName = el.tagName?.toLowerCase() || '';
                        const role = el.getAttribute('role')?.toLowerCase() || '';
                        const uiKeywords = ['menu', 'navigation', 'header', 'sidebar', 'toolbar', 'profile', 'workflow', 'history', 'recent', 'library', 'settings', 'account', 'feedback'];
                        
                        const hasUIKeyword = uiKeywords.some(kw => className.includes(kw) || id.includes(kw));
                        const isNavRole = ['navigation', 'banner', 'button', 'menuitem', 'tab', 'toolbar'].includes(role);
                        const isNavTag = ['nav', 'header', 'aside', 'button', 'footer'].includes(tagName);
                        
                        let isNavParent = false;
                        let parent = el.parentElement;
                        while (parent) {
                            const pName = (parent.className || '').toLowerCase();
                            if (pName.includes('sidebar') || pName.includes('nav')) {
                                isNavParent = true;
                                break;
                            }
                            parent = parent.parentElement;
                        }

                        return hasUIKeyword || isNavRole || isNavTag || isNavParent;
                    };

                    // Try to find video tag, source tag, or even a download button with a direct link
                    const selectors = [
                        'ms-content-view video',
                        '.model-response-text video',
                        '[role="article"] video',
                        'video',
                        '.generated-video',
                        '[data-test-id*="video"] video',
                        'video[src*="googlevideo"]',
                        'video[src*="google.com"]',
                        'video[src^="blob:"]',
                        'a[download*="video"]',
                        'a[href*="googlevideo"]',
                        'a[href*="download"]',
                        'button[aria-label*="Download"]'
                    ];

                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        console.log(\`[AIStudio Debug] Selector "\${selector}" found \${elements.length} elements\`);

                        if (elements.length > 0) {
                            const last = elements[elements.length - 1];

                            // Basic check to ensure we aren't picking up a background video in the UI
                            if (isNav(last) || (last.closest && (last.closest('nav') || last.closest('header')))) {
                                console.log('[AIStudio Debug] Skipping video likely in navigation area');
                                continue;
                            }

                            const url = last.src || last.href || (last.querySelector && last.querySelector('source')?.src);
                            if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
                                console.log(\`[AIStudio Debug] Found video URL: \${url.substring(0, 100)}...\`);
                                return url;
                            }
                        }
                    }

                    console.log('[AIStudio Debug] No video found in UI');
                    return null;
                })()`);

                const uiVideoUrl = uiVideoUrlResult as string | null;

                page.off('response', responseListener);
                clearTimeout(timeout);

                const finalUrl = uiVideoUrl || capturedUrl;
                if (!finalUrl) {
                    // One last ditch effort: look for ANY link or blob that was captured
                    throw new Error('Could not find generated video URL in UI or network logs');
                }

                console.log('[AIStudio] Successfully extracted video URL:', finalUrl);
                resolve(finalUrl);

            } catch (error: any) {
                page.off('response', responseListener);
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Start Sync Flow (Manual Login)
     */
    async syncWithGoogle(): Promise<{ count: number }> {
        // Launch visible browser
        await browserManager.init(false);
        const page = await browserManager.getPage();

        console.log('[AIStudio] Navigating to Login Page...');
        try {
            await page.goto('https://aistudio.google.com/app/home', { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Wait for successful login (Heuristic: "Create new" button or specific URL)
            console.log('[AIStudio] Waiting for user to login...');

            // Wait up to 5 minutes for user to login
            // We look for multiple indicators: "Create new", "Playground", "Dashboard", or the profile icon
            const loginIndicator = await page.waitForFunction(() => {
                const text = document.body.innerText;
                const url = window.location.href;
                return (
                    text.includes('Create new') ||
                    text.includes('Playground') ||
                    text.includes('Dashboard') ||
                    url.includes('/prompts/new_chat') ||
                    !!document.querySelector('img[src*="googleusercontent.com"]') // Profile photo
                );
            }, { timeout: 300000 });
            console.log('[AIStudio] Login detected! Capturing cookies...');

            const cookies = await page.context().cookies();
            this.isReady = true;

            // Persist to DB
            await this.saveCookiesToDB(cookies);

            // Optional: Close browser after sync
            await browserManager.close();

            return { count: cookies.length };
        } catch (error: any) {
            console.error('[AIStudio] Sync Timeout or Failed:', error.message);
            await browserManager.close();

            if (error.message.includes('closed')) {
                throw new Error('Browser window was closed before sync completed.');
            }
            throw new Error('Sync timed out or failed. Please ensure you logged in and reached the AI Studio home page.');
        }
    }

    /**
     * Generate Text using automated browser
     */
    async generateText(prompt: string): Promise<string> {
        if (!this.isReady) await this.init();
        const page = await browserManager.getPage();

        const inputSelector = await this.ensureChatPage();
        console.log('[AIStudio] Found input box. Sending text prompt...');

        // Clear old content if any (best effort)
        await page.click(inputSelector);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');

        // Fill and send
        await page.fill(inputSelector, prompt);
        await page.press(inputSelector, 'Enter');

        console.log('[AIStudio] Prompt sent. Waiting for text response...');

        // Strategy: Wait for the "Stop" button to disappear OR the "Run" button to be enabled again
        // In AI Studio, the "Run" button or Enter key triggers generation.
        // We look for the latest response bubble.

        // Heuristic: The latest response is usually the last div in a specific container
        // Or we can wait for a specific network idle state or a selector that indicates completion.

        try {
            // Wait for generation to start (Stop button appears)
            await page.waitForSelector('button[aria-label*="Stop"]', { timeout: 15000 }).catch(() => { });

            // Wait for generation to finish (Stop button disappears)
            await page.waitForSelector('button[aria-label*="Stop"]', { state: 'detached', timeout: 90000 });

            // Buffer delay for UI to stabilize and response to fully render
            await page.waitForTimeout(2000);

            // Enhanced response extraction with string-based evaluation to avoid bundler interference
            // Enhanced response extraction with string-based evaluation to avoid bundler interference
            const responseText = await page.evaluate(`(() => {
                console.log('[AIStudio Debug] Starting response extraction...');

                // Helper: Check if element is strictly inside navigation or structural UI
                const isNav = (el: any) => {
                    const text = (el.innerText || '').toLowerCase().trim();
                    
                    // 1. Structural check (closest container)
                    const navContainer = el.closest('nav, header, footer, aside, [role="navigation"], [role="banner"], .ms-sidebar, .sidebar, #sidebar, .ms-aistudio-header, .ms-aistudio-sidebar');
                    if (navContainer) {
                        return { isNav: true, reason: 'structural-container' };
                    }
                    
                    // 2. Exact or partial keyword match for navigation items
                    const uiKeywords = [
                        'skip to main', 'run settings', 'get code', 'reset_settings', 'gemini 1.5', 'gemini 2', 'gemini 3', 
                        'api key', 'billing', 'usage', 'home', 'playground', 'terms of service', 'privacy policy'
                    ];
                    if (uiKeywords.some(kw => text.includes(kw) && text.length < 100)) {
                        return { isNav: true, reason: 'nav-keyword' };
                    }

                    // 3. Class name/ID check
                    const className = (el.className || '').toString().toLowerCase();
                    const id = (el.id || '').toLowerCase();
                    if (className.includes('nav') || className.includes('header') || className.includes('footer') || id.includes('nav') || id.includes('header')) {
                        return { isNav: true, reason: 'class-id-match' };
                    }

                    return { isNav: false };
                };

                // Strategy 1: Targeted AI Studio response containers (ordered by reliability)
                const highPrioritySelectors = [
                    '.model-response-text',
                    'ms-content-view .model-response-text',
                    '.markdown',
                    'ms-content-view .markdown',
                    '.chat-message[data-role="model"]',
                    '.message-content',
                    'main .model-response-text',
                    'main .markdown'
                ];
                
                for (const selector of highPrioritySelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(\`[AIStudio Debug] Selector "\${selector}" found \${elements.length} elements\`);
                        // Iterate backwards to get the LATEST response
                        for (let i = elements.length - 1; i >= 0; i--) {
                            const el = elements[i];
                            const navCheck = isNav(el);
                            if (navCheck.isNav) {
                                console.log(\`[AIStudio Debug] Skipping "\${selector}" item - Reason: \${navCheck.reason}\`);
                                continue;
                            }
                            
                            const text = el.innerText?.trim();
                            // Genuine responses are usually more than just a few characters
                            if (text && text.length > 10) {
                                console.log(\`[AIStudio Debug] Found qualifying content in "\${selector}"\`);
                                return text;
                            }
                        }
                    }
                }

                // Strategy 2: Fallback - Largest text block in main area
                const mainArea = document.querySelector('main') || document.querySelector('ms-content-view') || document.body;
                const blocks = mainArea.querySelectorAll('div, section, article, p');
                let bestText = '';
                for (const el of Array.from(blocks)) {
                    if (isNav(el).isNav) continue;
                    const text = el.innerText?.trim();
                    if (text && text.length > bestText.length && text.length > 50) {
                        bestText = text;
                    }
                }
                
                if (bestText) return bestText;

                return '';
            })()`);

            if (!responseText) {
                // If everything failed, try to capture ALL text from the main area for debugging
                const diagnosticInfo = await page.evaluate(() => {
                    const mainElement = document.querySelector('main') || document.querySelector('ms-content-view') || document.body;
                    return {
                        url: window.location.href,
                        title: document.title,
                        mainTextSnippet: (mainElement as HTMLElement).innerText?.substring(0, 1000) || 'NO TEXT FOUND',
                        htmlStructure: Array.from(document.querySelectorAll('main div, main section')).slice(0, 10).map(el => ({
                            tag: el.tagName,
                            classes: el.className,
                            id: el.id,
                            textSnippet: (el as HTMLElement).innerText?.substring(0, 50)
                        }))
                    };
                });

                console.error('[AIStudio] Extraction Failed. Diagnostic Info:', JSON.stringify(diagnosticInfo, null, 2));
                throw new Error('Could not extract response text from UI. UI might have changed or response is missing.');
            }

            const responseStr = responseText as string;
            console.log(`[AIStudio] Successfully extracted response: ${responseStr.substring(0, 100)}...`);
            return responseStr.trim();
        } catch (error: any) {
            console.error('[AIStudio] Text Generation Error:', error.message);
            throw new Error(`AIStudio Text Generation Failed: ${error.message}`);
        }
    }

    /**
     * Generate Image using automated browser
     */
    async generateImage(prompt: string): Promise<string> {
        if (!this.isReady) await this.init();
        const page = await browserManager.getPage();
        const inputSelector = await this.ensureChatPage();

        console.log('[AIStudio] Attempting to use Imagen tool...');
        const toolSelected = await this.selectTool('Imagen').catch(() => false);

        if (toolSelected) {
            console.log('[AIStudio] Tool selected, sending prompt...');
        } else {
            console.log('[AIStudio] Tool menu not found or item missing, using direct prompt with prefix...');
            await page.click(inputSelector);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type('Generate an image: ');
        }

        await page.keyboard.type(prompt);
        await page.press(inputSelector, 'Enter');

        console.log('[AIStudio] Image prompt sent. Waiting for generation...');

        // Network monitoring for image URLs (as backup)
        let capturedImageUrl: string | null = null;
        const imageResponseListener = async (response: any) => {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';

            if (contentType.includes('image/') || url.includes('googleusercontent.com') && url.includes('image')) {
                console.log(`[AIStudio] Captured image URL from network: ${url.substring(0, 100)}...`);
                capturedImageUrl = url;
            }
        };

        page.on('response', imageResponseListener);

        try {
            // Wait for generation process
            await page.waitForSelector('button[aria-label*="Stop"]', { timeout: 15000 }).catch(() => { });
            await page.waitForSelector('button[aria-label*="Stop"]', { state: 'detached', timeout: 180000 }); // Images can take a while

            // Small delay for UI to settle
            await page.waitForTimeout(2000);

            // Extract the latest image URL with enhanced selectors (string-based)
            const imageUrl = await page.evaluate(`(() => {
                console.log('[AIStudio Debug] Starting image extraction...');

                // Helper: Check if element is strictly inside navigation
                const isNav = (el) => {
                    if (el.closest('nav, header, footer, aside, [role="navigation"], [role="banner"], .sidebar, #sidebar, .ms-sidebar, .ms-aistudio-sidebar')) {
                        return true;
                    }
                    return false;
                };

                const selectors = [
                    'main .model-response-text img',
                    'main img',
                    'ms-content-view img',
                    '.model-response-text img',
                    '[role="article"] img',
                    '.generated-image',
                    'img[src*="googleusercontent"]'
                ];

                for (const selector of selectors) {
                    const images = document.querySelectorAll(selector);
                    if (images.length > 0) {
                        for (let i = images.length - 1; i >= 0; i--) {
                            const img = images[i];
                            if (isNav(img)) continue;

                            const src = img.src || img.getAttribute('src');
                            if (src && src.length > 0 && !src.includes('avatar') && !src.includes('profile')) {
                                return src;
                            }
                        }
                    }
                }

                return '';
            })()`);

            const imageStr = imageUrl as string;
            page.off('response', imageResponseListener);

            // Use network-captured URL as fallback
            const finalUrl = imageStr || capturedImageUrl;

            if (!finalUrl) {
                const pageUrl = page.url();
                console.error('[AIStudio] Failed to extract image. Page URL:', pageUrl);
                throw new Error('Could not find generated image in UI or network logs');
            }

            console.log(`[AIStudio] Successfully extracted image URL: ${finalUrl.substring(0, 100)}...`);
            return finalUrl;
        } catch (error: any) {
            page.off('response', imageResponseListener);
            console.error('[AIStudio] Image Generation Error:', error.message);
            throw new Error(`AIStudio Image Generation Failed: ${error.message}`);
        }
    }

    /**
     * Generate Audio using automated browser
     */
    async generateAudio(prompt: string): Promise<string> {
        if (!this.isReady) await this.init();
        const page = await browserManager.getPage();

        const inputSelector = await this.ensureChatPage();
        console.log('[AIStudio] Found input box. Sending audio prompt...');

        await page.click(inputSelector);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');

        // Request audio output
        await page.fill(inputSelector, `Generate audio / speech for this text: ${prompt} `);
        await page.press(inputSelector, 'Enter');

        console.log('[AIStudio] Audio prompt sent. Waiting for generation...');

        try {
            await page.waitForSelector('button[aria-label*="Stop"]', { timeout: 15000 }).catch(() => { });
            await page.waitForSelector('button[aria-label*="Stop"]', { state: 'detached', timeout: 120000 });

            // Extract the latest audio URL (string-based)
            const audioUrlResult = await page.evaluate(`(() => {
                const audios = document.querySelectorAll('ms-content-view audio, .model-response-text audio, [role="article"] audio');
                if (audios.length === 0) return '';
                const lastAudio = audios[audios.length - 1];
                return lastAudio.src || '';
            })()`);

            const audioUrl = audioUrlResult as string;

            if (!audioUrl) throw new Error('Could not find generated audio in UI');
            return audioUrl;
        } catch (error: any) {
            console.error('[AIStudio] Audio Generation Error:', error.message);
            throw new Error(`AIStudio Audio Generation Failed: ${error.message}`);
        }
    }

    /**
     * Update Cookies from Admin
     */
    async updateCookies(cookies: any[]) {
        const page = await browserManager.getPage();
        const context = page.context();

        // Chromium/Playwright can be inconsistent: try explicit domain + path and NO url
        const sanitizedCookies = cookies.map((c, idx) => {
            if (!c.name || !c.value) return null;

            const sanitized: any = {
                name: String(c.name),
                value: String(c.value),
                domain: String(c.domain || '.google.com'),
                path: String(c.path || '/'),
                httpOnly: !!c.httpOnly,
                secure: !!c.secure,
            };

            // Handling __Secure- and __Host- prefixes (Strict requirement)
            if (sanitized.name.startsWith('__Secure-')) {
                sanitized.secure = true;
            }
            if (sanitized.name.startsWith('__Host-')) {
                sanitized.secure = true;
                sanitized.path = '/';
                delete sanitized.domain; // __Host- cookies MUST NOT have domain attribute
            }

            // Handle SameSite - MUST be normalized string
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
                if (!isNaN(exp) && exp > 0) {
                    sanitized.expires = Math.floor(exp);
                }
            }

            return sanitized;
        }).filter(Boolean);

        console.log(`[AIStudio] Final attempt adding ${sanitizedCookies.length} cookies with explicit domain / path.`);
        try {
            await context.addCookies(sanitizedCookies);
        } catch (e: any) {
            console.error('[AIStudio] addCookies failed:', e.message);
            // Fallback: try adding them one by one to find the culprit
            for (const cookie of sanitizedCookies) {
                await context.addCookies([cookie]).catch(err => {
                    console.warn(`[AIStudio] Skipping invalid cookie[${cookie.name}]: `, err.message);
                });
            }
        }
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
        this.isReady = true;

        // Persist the sanitized cookies to DB
        await this.saveCookiesToDB(sanitizedCookies);
    }
}

export const aiStudioClient = new AIStudioClient();
