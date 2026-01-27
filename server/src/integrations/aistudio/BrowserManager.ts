import { chromium, firefox, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

export class BrowserManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private userDataDir: string;

    constructor(userDataDir: string = './.aistudio-data') {
        this.userDataDir = path.resolve(userDataDir);
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }
    }

    public hasSession(): boolean {
        const cookiesPath = path.join(this.userDataDir, 'cookies.json');
        const profileDir = path.join(this.userDataDir, 'profile');
        return fs.existsSync(cookiesPath) || fs.existsSync(profileDir);
    }

    async init(headless = true) {
        console.log(`[AIStudio] Launching Browser (Headless: ${headless})...`);

        // Use a dedicated persistent profile folder instead of a temporary context
        // This is much harder to detect and saves login state across runs
        const profileDir = path.join(this.userDataDir, 'profile');
        if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

        // Close existing if we are switching/running
        if (this.browser || this.context) await this.close();

        // launchPersistentContext returns a context directly
        this.context = await chromium.launchPersistentContext(profileDir, {
            headless: headless,
            channel: 'chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors'
            ],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 },
        });

        console.log('[AIStudio] Context Created (Persistent Profile used).');

        this.page = this.context.pages()[0] || await this.context.newPage();

        // Advanced Stealth: Overwrite more detectable properties
        await this.page.addInitScript(() => {
            // Hide Automation
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

            // WebGL Stealth
            const getParameter = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type: any) {
                const context = getParameter.apply(this, arguments as any);
                if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') {
                    const debugInfo = (context as any).getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const originalGetParameter = (context as any).getParameter;
                        (context as any).getParameter = function (param: number) {
                            if (param === 37445) return 'Intel Inc.';
                            if (param === 37446) return 'Intel(R) Iris(R) Xe Graphics';
                            return originalGetParameter.apply(this, arguments as any);
                        };
                    }
                }
                return context as any;
            };
        });
    }

    async getPage(): Promise<Page> {
        if (!this.page) {
            await this.init();
        }
        return this.page!;
    }

    async close() {
        try {
            if (this.context) {
                // When using launchPersistentContext, cookies are already saved in the profile dir.
                // We only try to export them to cookies.json if possible.
                try {
                    const cookies = await this.context.cookies();
                    if (cookies.length > 0) {
                        fs.writeFileSync(path.join(this.userDataDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
                    }
                } catch (e) {
                    // Context might be closed already if user closed the window
                    console.debug('[BrowserManager] Could not export cookies (context closed)');
                }

                await this.context.close().catch(() => { });
            }
            if (this.browser) {
                await this.browser.close().catch(() => { });
            }
        } catch (error) {
            console.error('[BrowserManager] error during close:', error);
        } finally {
            this.page = null;
            this.context = null;
            this.browser = null;
        }
    }

    async refreshSession() {
        // Reload page or re-login logic
        const page = await this.getPage();
        await page.reload({ waitUntil: 'networkidle' });
    }
}

export const browserManager = new BrowserManager();
