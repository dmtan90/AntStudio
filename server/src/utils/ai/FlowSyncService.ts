import axios from 'axios';
import { chromium, BrowserContext, Browser } from 'playwright';
import { AIAccount, AIAccountStatus, IAIAccount } from '../../models/AIAccount.js';
import { Logger } from '../Logger.js';

export class FlowSyncService {
    private static instance: FlowSyncService;
    private isSyncing = false;

    private constructor() {}

    public static getInstance(): FlowSyncService {
        if (!FlowSyncService.instance) {
            FlowSyncService.instance = new FlowSyncService();
        }
        return FlowSyncService.instance;
    }

    /**
     * Build unified request headers mimicking the Python flow_client
     */
    private getHeaders(st?: string, at?: string, extraHeaders: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/',
            'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            ...extraHeaders
        };

        if (st) {
            headers['Cookie'] = `__Secure-next-auth.session-token=${st}`;
        }
        if (at) {
            headers['Authorization'] = `Bearer ${at}`;
        }

        return headers;
    }

    /**
     * Start the background sync process
     */
    public start() {
        // Run every 30 minutes
        setInterval(() => this.syncAllAccounts(), 30 * 60 * 1000);
        this.syncAllAccounts();
    }

    /**
     * Sync all Google Flow accounts
     */
    public async syncAllAccounts() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        Logger.info('[FlowSyncService] Starting background sync for Google Flow accounts...');

        try {
            const accounts = await AIAccount.find({ accountType: 'google-flow', isActive: true });
            for (const account of accounts) {
                try {
                    await this.refreshAccountTokens(account);
                } catch (err: any) {
                    Logger.error(`[FlowSyncService] Failed to sync account ${account.email}:`, err.message);
                }
            }
        } catch (err: any) {
            Logger.error('[FlowSyncService] Background sync error:', err.message);
        } finally {
            this.isSyncing = false;
            Logger.info('[FlowSyncService] Background sync completed.');
        }
    }

    /**
     * Refresh tokens for a single account
     * Priority: Use existing flowST to get new flowAT. 
     */
    public async refreshAccountTokens(account: IAIAccount): Promise<void> {
        if (!account.flowST) {
            Logger.warn(`[FlowSyncService] No Session Token (ST) for ${account.email}. Skipping refresh.`);
            return;
        }

        Logger.info(`[FlowSyncService] Refreshing tokens for ${account.email}...`);

        // Skip refresh if token is still valid (has >5 minutes remaining)
        // if (account.flowAT && account.flowATExpiresAt) {
        //     const expiresAt = new Date(account.flowATExpiresAt).getTime();
        //     if (expiresAt > Date.now() + 5 * 60 * 1000) {
        //         Logger.info(`[FlowSyncService] Token still valid for ${account.email}, skipping refresh.`);
        //         return;
        //     }
        // }

        try {
            // 1. Convert ST to AT
            const session = await this.stToAt(account.flowST);
            
            if (session && (session.access_token || session.user)) {
                // Labs Flow API may return token in different field names
                const newAT = session.access_token;
                if (newAT) {
                    account.flowAT = newAT;
                    Logger.info(`[FlowSyncService] New access token obtained for ${account.email}`);
                    Logger.info(`[FlowSyncService] New access token: ${newAT}`);
                } else {
                    Logger.warn(`[FlowSyncService] Session returned no access_token for ${account.email}, keeping existing AT`);
                }

                if (session.expires) {
                    const expiresAt = new Date(session.expires).getTime();
                    // If the session returned by Google is ALREADY expired, the flowST is stale.
                    // Google's endpoint will still decode validly signed JWTs even if expired, but we cannot use the AT.
                    if (expiresAt < Date.now()) {
                        Logger.warn(`[FlowSyncService] Session for ${account.email} returned an expired token (${session.expires}). The flowST needs to be updated.`);
                        account.status = AIAccountStatus.UNAUTHORIZED;
                        account.flowAT = undefined;
                        account.flowATExpiresAt = undefined;
                        await account.save();
                        throw new Error('Session token has expired. Please update it in the UI.');
                    }
                    account.flowATExpiresAt = new Date(session.expires);
                }
                
                // Update profile info from session
                if (session.user) {
                    account.email = session.user.email || account.email;
                    account.name = session.user.name || account.name;
                    account.avatarUrl = session.user.image || account.avatarUrl;
                }


                // Ensure Project ID exists
                await this.ensureProject(account, session);

                // IMPORTANT: Save token to DB FIRST before fetching credits
                account.status = AIAccountStatus.READY;
                account.errorMessage = undefined;
                await account.save();

                // Fetch credits using aisandbox-pa (requires fresh Google OAuth AT)
                if (account.flowAT) {
                    let creditsFetched = false;
                    // Attempt 1: aisandbox-pa REST endpoint with API key
                    try {
                        const GOOGLE_FLOW_API_KEY = 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY';
                        const creditsRes = await axios.get(`https://aisandbox-pa.googleapis.com/v1/credits?key=${GOOGLE_FLOW_API_KEY}`, {
                            headers: this.getHeaders(undefined, account.flowAT)
                        });
                        if (creditsRes.data?.credits !== undefined) {
                            account.credits = creditsRes.data.credits;
                            creditsFetched = true;
                            Logger.info(`[FlowSyncService] Credits (REST) for ${account.email}: ${account.credits}`);
                        }
                    } catch (e1: any) {
                        const status = e1.response?.status;
                        
                        // CRITICAL FIX: If Google rejects the new AT with 401, the underlying session (flowST) is actually expired, 
                        // even though we could decode it. We must mark the account as unauthorized so the user knows to update it.
                        if (status === 401) {
                            Logger.warn(`[FlowSyncService] CRITICAL: New access token was immediately rejected (401). The session cookie (flowST) for ${account.email} has expired.`);
                            account.status = AIAccountStatus.UNAUTHORIZED;
                            account.flowAT = undefined; // Clear the invalid token
                            await account.save();
                            throw new Error('Session token has expired. Please update it in the UI.');
                        }

                        const errBody = JSON.stringify(e1.response?.data || e1.message);
                        Logger.info(`[FlowSyncService] Credits REST failed (${status}): ${errBody}`);
                    }

                    // Attempt 2: tRPC videoFx.credits via session cookie (how the browser does it)

                    if (!creditsFetched && account.flowST) {
                        try {
                            const trpcRes = await axios.post('https://labs.google/fx/api/trpc/videoFx.credits', { json: null }, {
                                headers: this.getHeaders(account.flowST, account.flowAT, {
                                    'Referer': 'https://labs.google/fx/tools/flow'
                                })
                            });
                            // Parse as per flow_client.py: result.data.json.credits
                            const trpcData = trpcRes.data?.result?.data?.json;
                            if (trpcData?.credits !== undefined) {
                                account.credits = trpcData.credits;
                                creditsFetched = true;
                                Logger.info(`[FlowSyncService] Credits (tRPC/cookie) for ${account.email}: ${account.credits}`);
                            } else {
                                Logger.info(`[FlowSyncService] Credits tRPC response: ${JSON.stringify(trpcRes.data)}`);
                            }
                        } catch (e2: any) {
                            const errBody = JSON.stringify(e2.response?.data || e2.message);
                            Logger.info(`[FlowSyncService] Credits tRPC failed (${e2.response?.status}): ${errBody}`);
                        }
                    }

                    // Attempt 3: aisandbox-pa REST endpoint with API key and session cookie
                    if (!creditsFetched && account.flowST) {
                        try {
                            const GOOGLE_FLOW_API_KEY = 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY';
                            const creditsRes = await axios.get(`https://aisandbox-pa.googleapis.com/v1/credits`, {
                                headers: this.getHeaders(account.flowST, undefined, {
                                    'x-goog-api-key': GOOGLE_FLOW_API_KEY
                                })
                            });
                            if (creditsRes.data?.credits !== undefined) {
                                account.credits = creditsRes.data.credits;
                                creditsFetched = true;
                                Logger.info(`[FlowSyncService] Credits (REST/cookie) for ${account.email}: ${account.credits}`);
                            }
                        } catch (e3: any) {
                            const errBody = JSON.stringify(e3.response?.data || e3.message);
                            Logger.info(`[FlowSyncService] Credits REST (cookie) failed (${e3.response?.status}): ${errBody}`);
                        }
                    }

                    if (creditsFetched) {
                        await account.save();
                    } else {
                        Logger.warn(`[FlowSyncService] All credit fetch attempts failed for ${account.email}, using cached: ${account.credits || 0}`);
                    }
                }
                Logger.info(`[FlowSyncService] Tokens refreshed successfully for ${account.email} (Credits: ${account.credits || 0}, Project: ${account.projectId || 'None'})`);
            } else {
                throw new Error('Invalid session response: No access token or user info found');
            }
        } catch (err: any) {
            Logger.error(`[FlowSyncService] Token refresh failed for ${account.email}:`, err.message);
            
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                account.status = AIAccountStatus.UNAUTHORIZED;
                await account.save();
            }
            // Do not throw to prevent unhandled promise rejections that might crash the background sync process
        }
    }

    /**
     * Ensure a projectId exists for the account. 
     * Strategy:
     * 1. Check local account.projectId
     * 2. If missing, look in session workspace
     * 3. If still missing, create a new one
     */
    public async ensureProject(account: IAIAccount, session?: any): Promise<string> {
        // 1. Check existing
        if (account.projectId) {
            return account.projectId;
        }

        Logger.info(`[FlowSyncService] Project ID missing for ${account.email}. Attempting to resolve...`);

        // 2. Try session extraction
        if (session) {
            const workspace = session.workspace || session.user?.workspace;
            if (workspace?.id) {
                account.projectId = workspace.id;
                await account.save();
                Logger.info(`[FlowSyncService] Resolved projectId from session for ${account.email}: ${account.projectId}`);
                return account.projectId as string;
            }
        }

        // 3. Fallback: Create new project (trpc project.createProject)
        // Note: Needs ST or AT depending on endpoint, but createProject typically uses ST (Cookie)
        if (account.flowST) {
            try {
                Logger.info(`[FlowSyncService] Creating new project for ${account.email}...`);
                const title = `AntStudio - ${account.email.split('@')[0]}`;
                const createRes = await axios.post('https://labs.google/fx/api/trpc/project.createProject', {
                    json: {
                        projectTitle: title,
                        toolName: "PINHOLE"
                    }
                }, {
                    headers: this.getHeaders(account.flowST, undefined, {
                        'Referer': 'https://labs.google/fx/tools/flow'
                    })
                });

                const projectId = createRes.data?.result?.data?.json?.result?.projectId;
                if (projectId) {
                    account.projectId = projectId;
                    await account.save();
                    Logger.info(`[FlowSyncService] Successfully created and saved project for ${account.email}: ${account.projectId}`);
                    return projectId;
                }
            } catch (createErr: any) {
                Logger.error(`[FlowSyncService] Failed to create project for ${account.email}:`, createErr.response?.data || createErr.message);
            }
        }

        throw new Error(`Could not resolve or create Project ID for ${account.email}`);
    }

    /**
     * Convert Session Token (ST) to Access Token (AT)
     */
    private async stToAt(st: string): Promise<any> {
        const url = 'https://labs.google/fx/api/auth/session';
        const headers = this.getHeaders(st, undefined, {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        });

        try {
            const response = await axios.get(url, { 
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500 // Don't throw on 401 so we can log it custom
            });

            if (response.status === 401 || !response.data.access_token || !response.data.user) {
                Logger.error(`[FlowSyncService] Unauthorized: Session token (ST) seems invalid or expired.`);
                throw new Error('Unauthorized: Session token expired');
            }
            Logger.info(`[FlowSyncService] Session token (ST) converted to access token: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (err: any) {
            Logger.error(`[FlowSyncService] stToAt request failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Experimental: Extract ST from browser
     */
    public async extractTokenFromBrowser(email?: string): Promise<string | null> {
        Logger.info(`[FlowSyncService] Attempting browser extraction for ${email || 'unknown account'}...`);
        let context: BrowserContext | null = null;
        let browser: Browser | null = null;

        try {
            browser = await chromium.launch({ headless: true });
            context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 720 }
            });

            const page = await context.newPage();
            await page.goto('https://labs.google/fx/signin', { waitUntil: 'networkidle' });

            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === '__Secure-next-auth.session-token');

            if (sessionCookie) {
                Logger.info(`[FlowSyncService] Successfully extracted ST from browser`);
                return sessionCookie.value;
            }

            return null;
        } catch (err: any) {
            Logger.error('[FlowSyncService] Browser extraction failed:', err.message);
            return null;
        } finally {
            if (browser) await browser.close();
        }
    }
}

export const flowSyncService = FlowSyncService.getInstance();
