import axios from 'axios';
import crypto from 'crypto';
import { AIAccount, IAIAccount } from '../../models/AIAccount.js';
import { AdminSettings } from '../../models/AdminSettings.js';
import { AntigravityClient } from '../../integrations/ai/AntigravityClient.js';

// Authorization endpoints
const AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email'
];

export class AIAccountManager {
    private static instance: AIAccountManager;

    private constructor() { }

    public static getInstance(): AIAccountManager {
        if (!AIAccountManager.instance) {
            AIAccountManager.instance = new AIAccountManager();
        }
        return AIAccountManager.instance;
    }

    /**
     * Sanitizes a model ID to be used as a Mongoose Map key (replace dots with underscores)
     */
    private sanitizeModelId(modelId: string): string {
        return modelId.replace(/\./g, '_');
    }

    /**
     * Desanitizes a model ID for display or API usage (replace underscores back to dots if appropriate)
     * Note: This is a simple heuristic; it assumes underscores between numbers were likely dots.
     */
    private desanitizeModelId(safeId: string): string {
        // Only convert back patterns like "1_5" to "1.5"
        return safeId.replace(/(\d)_(\d)/g, '$1.$2');
    }

    /**
     * Get OAuth credentials from AdminSettings
     */
    private async getCredentials() {
        const settings = await AdminSettings.findOne();
        const creds = settings?.apiConfigs?.aiOAuth?.google;

        if (!creds || !creds.clientId) {
            console.warn('[AIAccountManager] No Google OAuth credentials found in AdminSettings');
            return null;
        }

        return creds;
    }

    /**
     * Generate common OAuth authorization URL
     */
    public async getAuthorizationUrl(redirectUri: string, params: { state?: string, isAntigravity?: boolean } = {}): Promise<string> {
        let clientId = '';
        let scopes = SCOPES;

        if (params.isAntigravity) {
            clientId = AntigravityClient.CLIENT_ID;
            scopes = AntigravityClient.SCOPES;
        } else {
            const creds = await this.getCredentials();
            if (!creds) throw new Error('Google OAuth credentials not configured in Admin Settings > AI Accounts');
            clientId = creds.clientId;
        }

        const urlParams = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state: params.state || crypto.randomBytes(16).toString('hex')
        });

        return `${AUTH_URL}?${urlParams.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    public async exchangeCodeForTokens(code: string, redirectUri: string, options: { isAntigravity?: boolean } = {}) {
        let clientId = '';
        let clientSecret = '';

        if (options.isAntigravity) {
            clientId = AntigravityClient.CLIENT_ID;
            clientSecret = AntigravityClient.CLIENT_SECRET;
        } else {
            const creds = await this.getCredentials();
            if (!creds || !creds.clientId || !creds.clientSecret) {
                throw new Error('Google OAuth Client ID or Client Secret is missing in settings');
            }
            clientId = creds.clientId;
            clientSecret = creds.clientSecret;
        }

        try {
            const response = await axios.post(TOKEN_URL, new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }).toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token, refresh_token, expires_in } = response.data;

            // Get user email and picture
            const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const { email, picture } = userResponse.data;

            // Save or update account
            const accountType = options.isAntigravity ? 'antigravity' : 'standard';
            let account = await AIAccount.findOne({ email, accountType });

            if (account) {
                account.refreshToken = refresh_token || account.refreshToken;
                account.accessToken = access_token;
                account.accessTokenExpiresAt = new Date(Date.now() + expires_in * 1000);
                account.avatarUrl = picture || account.avatarUrl;
                account.status = 'ready';
                await account.save();
            } else {
                account = await AIAccount.create({
                    email,
                    providerId: 'google',
                    accountType,
                    refreshToken: refresh_token,
                    accessToken: access_token,
                    accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
                    avatarUrl: picture,
                    status: 'ready'
                });
            }

            // PROACTIVE DISCOVERY: If Antigravity, discover Project ID immediately
            if (options.isAntigravity) {
                console.log(`[AIAccountManager] Starting proactive Project ID discovery for ${email}...`);
                // Run in background to not block the redirect response, though it's relatively fast
                this.discoverProjectId(account).catch(err => {
                    console.error(`[AIAccountManager] Proactive discovery failed for ${email}:`, err.message);
                });

                // PROACTIVE SYNC: Sync quotas and available models immediately
                this.syncQuotas(account).catch(err => {
                    console.error(`[AIAccountManager] Proactive sync failed for ${email}:`, err.message);
                });
            }

            return account;
        } catch (error: any) {
            console.error('[AIAccountManager] Token Exchange Error:', error.response?.data || error.message);
            throw new Error('Failed to exchange authorization code for tokens');
        }
    }

    /**
     * Refresh access token for a specific account
     */
    public async refreshAccessToken(account: IAIAccount, customCreds?: { clientId: string, clientSecret: string }): Promise<string> {
        if (account.accessToken && account.accessTokenExpiresAt && account.accessTokenExpiresAt.getTime() > Date.now() + 300000) {
            return account.accessToken;
        }

        try {
            let clientId = '';
            let clientSecret = '';

            if (account.accountType === 'antigravity' || customCreds) {
                clientId = customCreds?.clientId || AntigravityClient.CLIENT_ID;
                clientSecret = customCreds?.clientSecret || AntigravityClient.CLIENT_SECRET;
            } else {
                const creds = await this.getCredentials();
                if (!creds || !creds.clientId || !creds.clientSecret) {
                    throw new Error('Google OAuth credentials not configured');
                }
                clientId = creds.clientId;
                clientSecret = creds.clientSecret;
            }

            console.log(`[AIAccountManager] Refreshing token for ${account.email} (${account.accountType})...`);
            const searchParams = new URLSearchParams();
            searchParams.append('refresh_token', account.refreshToken || '');
            searchParams.append('client_id', clientId);
            searchParams.append('client_secret', clientSecret);
            searchParams.append('grant_type', 'refresh_token');

            const response = await axios.post(TOKEN_URL, searchParams.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const { access_token, expires_in } = response.data;

            account.accessToken = access_token;
            account.accessTokenExpiresAt = new Date(Date.now() + expires_in * 1000);
            account.status = 'ready';
            await account.save();

            return access_token;
        } catch (error: any) {
            console.error(`[AIAccountManager] Refresh Token Error for ${account.email}:`, error.response?.data || error.message);
            account.status = 'unauthorized';
            account.errorMessage = 'Refresh token expired or invalid';
            await account.save();
            throw new Error(`Failed to refresh token for ${account.email}`);
        }
    }

    /**
     * Get the most optimal account for a task
     */
    public async getOptimalAccount(type: 'text' | 'image' | 'video' | 'audio'): Promise<IAIAccount | null> {
        // Build base query
        const query: any = { isActive: true, status: 'ready' };

        // Prefer specific account types based on task if needed
        if (type === 'video') {
            // For video, 11labs-direct and antigravity are top tier
            // We can search for all then sort
        }

        const accounts = await AIAccount.find(query);

        if (accounts.length === 0) {
            const hourAgo = new Date(Date.now() - 3600000);
            const coolingAccounts = await AIAccount.find({
                isActive: true,
                status: 'rate-limited',
                updatedAt: { $lt: hourAgo }
            });

            if (coolingAccounts.length > 0) {
                coolingAccounts[0].status = 'ready';
                await coolingAccounts[0].save();
                return coolingAccounts[0];
            }

            return null;
        }

        accounts.sort((a, b) => {
            const timeA = a.lastUsedAt?.getTime() || 0;
            const timeB = b.lastUsedAt?.getTime() || 0;
            return timeA - timeB;
        });

        const selected = accounts[0];
        selected.lastUsedAt = new Date();
        await selected.save();

        return selected;
    }

    /**
     * Create a new Google Cloud Project for an account
     */
    public async createProject(account: IAIAccount): Promise<string> {
        const token = await this.refreshAccessToken(account);
        const timestamp = Date.now();
        const shortEmail = account.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 10);
        const projectId = `antflow-${shortEmail}-${timestamp.toString().slice(-4)}`;
        const projectName = `AntStudio AI - ${account.email.split('@')[0]}`;

        try {
            console.log(`[AIAccountManager] Creating new project: ${projectId} for ${account.email}`);

            await axios.post('https://cloudresourcemanager.googleapis.com/v1/projects', {
                projectId,
                name: projectName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local record
            account.projectId = projectId;
            await account.save();

            return projectId;
        } catch (error: any) {
            console.error(`[AIAccountManager] Project Creation Error for ${account.email}:`, error.response?.data || error.message);
            const msg = error.response?.data?.error?.message || error.message;
            throw new Error(`Project creation failed: ${msg}`);
        }
    }

    /**
     * Discover Google Cloud Project ID for an account
     * Strategy:
     * 1. Try to fetch specialized cloudaicompanionProject (Preferred for Agent/Sandbox)
     * 2. Fall back to enumerating user projects via Resource Manager
     */
    public async discoverProjectId(account: IAIAccount): Promise<string> {
        if (account.projectId && !account.projectId.includes('default')) return account.projectId;

        // Try specialized discovery first (Works for both Antigravity and Standard with right scopes)
        try {
            const projectId = await this._discoverAntigravityProject(account);
            if (projectId) return projectId;
        } catch (err) {
            console.warn(`[AIAccountManager] Specialized discovery failed for ${account.email}, falling back to standard list`);
        }

        const token = await this.refreshAccessToken(account);
        try {
            const response = await axios.get('https://cloudresourcemanager.googleapis.com/v1/projects', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const projects = response.data.projects || [];
            if (projects.length === 0) throw new Error('No Google Cloud projects found for this account.');

            const bestProject = projects.find((p: any) => p.projectId.includes('gemini') || p.projectId.includes('ai')) || projects[0];

            account.projectId = bestProject.projectId;
            await account.save();

            return account.projectId!;
        } catch (error: any) {
            console.error(`[AIAccountManager] Project Discovery Error for ${account.email}:`, error.response?.data || error.message);
            throw new Error(`Metadata discovery failed for ${account.email}`);
        }
    }

    /**
     * Specialized Antigravity Project Discovery via loadCodeAssist and onboardUser
     */
    private async _discoverAntigravityProject(account: IAIAccount): Promise<string> {
        const token = await this.refreshAccessToken(account);
        const host = 'daily-cloudcode-pa.sandbox.googleapis.com';
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Host': host,
            'User-Agent': 'antigravity/1.13.3 windows/amd64',
            'Accept-Encoding': 'gzip'
        };

        try {
            console.log(`[AIAccountManager] Calling loadCodeAssist for ${account.email}...`);
            const loadRes = await axios.post(`https://${host}/v1internal:loadCodeAssist`, {
                metadata: {
                    ideType: 'ANTIGRAVITY'
                }
            }, { headers });

            const data = loadRes.data;

            console.log('[AIAccountManager] loadCodeAssist response:', JSON.stringify(data));

            // Extract project ID - plugin repo uses apiResponse.cloudaicompanionProject
            let projectId = data?.cloudaicompanionProject;

            // If it's an object (sometimes happens in LRO responses), get the id
            if (projectId && typeof projectId === 'object') {
                projectId = projectId.id;
            }

            if (projectId) {
                console.log(`[AIAccountManager] Found cloudaicompanionProject: ${projectId}`);
                account.projectId = projectId;

                // Track if it's a paid tier
                const isPaid = data.paidTier?.id && !data.paidTier.id.toLowerCase().includes('free');
                account.isPaid = !!isPaid;

                await account.save();
                return projectId;
            }

            // Fallback: Attempt onboardUser if project is missing
            const tierId = data?.eligibleTiers?.[0] || 'free';
            return await this._onboardAntigravityUser(account, token, tierId);
        } catch (error: any) {
            console.error(`[AIAccountManager] Antigravity Discovery Failed for ${account.email}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Handles the Long-Running Operation for user onboarding
     */
    private async _onboardAntigravityUser(account: IAIAccount, token: string, tierId: string): Promise<string> {
        const host = 'daily-cloudcode-pa.sandbox.googleapis.com';
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Host': host,
            'User-Agent': 'antigravity/1.13.3 windows/amd64',
            'Accept-Encoding': 'gzip'
        };

        console.log(`[AIAccountManager] Onboarding user ${account.email} (Tier: ${tierId})...`);
        const onboardRes = await axios.post(`https://${host}/v1internal:onboardUser`, {
            tierId,
            metadata: {
                ideType: 'ANTIGRAVITY'
            }
        }, { headers });

        const data = onboardRes.data;

        if (data?.done) {
            let projectId = data.response?.cloudaicompanionProject;
            if (projectId) {
                projectId = typeof projectId === 'string' ? projectId : projectId.id;
                account.projectId = projectId;
                await account.save();
                return projectId;
            }
        }

        // Simple polling if not done (LRO logic)
        // Note: For brevity in this task, we assume discovery usually happens during loadCodeAssist or first onboard try.
        // If it's a true LRO name, we would poll the operation endpoint.
        throw new Error('Onboarding operation pending. Please try syncing account again in a few seconds.');
    }

    /**
     * Synchronize available models from Antigravity and update account quotas
     */
    public async syncAvailableModels(account: IAIAccount): Promise<void> {
        if (account.accountType !== 'antigravity') return;

        try {
            const client = new AntigravityClient(account);
            const models = await client.fetchAvailableModels();

            if (!account.quotas) {
                account.quotas = new Map();
            }

            let changed = false;
            const discoveredIds = new Set<string>();

            for (const model of models) {
                const modelId = typeof model === 'string' ? model : (model.id || model.name);
                if (!modelId) continue;

                const safeId = this.sanitizeModelId(modelId);
                discoveredIds.add(safeId);

                if (!account.quotas.has(safeId)) {
                    // Default quota for newly discovered models
                    // We can be generous since Antigravity/Sandbox often has high limits
                    let limit = 20;
                    if (modelId.includes('flash')) limit = 50;
                    if (modelId.includes('pro')) limit = 15;
                    if (modelId.includes('image') || modelId.includes('imagen')) limit = 10;
                    if (modelId.includes('video') || modelId.includes('veo')) limit = 2;

                    account.quotas.set(safeId, { used: 0, limit });
                    changed = true;
                }
            }

            // PRUNING: Remove models that are no longer in the discovered list
            // This ensures the Antigravity account ONLY shows supported models
            for (const key of account.quotas.keys()) {
                if (!discoveredIds.has(key)) {
                    account.quotas.delete(key);
                    changed = true;
                }
            }

            if (changed) {
                account.markModified('quotas');
                await account.save();
                console.log(`[AIAccountManager] models synced and pruned for ${account.email}. Total: ${models.length}`);
            }
        } catch (error: any) {
            console.error(`[AIAccountManager] Sync models failed for ${account.email}:`, error.message);
        }
    }

    /**
     * Record usage for an account and model
     */
    public async recordUsage(account: IAIAccount, modelId: string): Promise<void> {
        try {
            const safeModelName = this.sanitizeModelId(modelId);
            account.lastUsedAt = new Date();

            if (!account.quotas) {
                account.quotas = new Map();
            }

            // Get current quota or default if missing
            let limit = 10;
            if (account.accountType === '11labs-direct') limit = 999999;
            else if (account.accountType === 'antigravity') limit = 100;

            const quota = account.quotas.get(safeModelName) || { used: 0, limit };
            quota.used++;
            account.quotas.set(safeModelName, quota);

            // Use markModified if needed for Map changes, but usually save handles it.
            // For subdocuments in Map, markModified('quotas') might be safer.
            account.markModified('quotas');
            await account.save();
        } catch (error: any) {
            console.error(`[AIAccountManager] Record usage failed for ${account.email}:`, error);
        }
    }

    /**
     * Synchronize quotas (initialize defaults for now)
     */
    public async syncQuotas(account: IAIAccount): Promise<void> {
        if (!account.quotas) {
            account.quotas = new Map();
        }

        const defaultModels = [
            // Gemini 3.0 Series
            { id: 'gemini-3.0-pro', limit: 5 },
            { id: 'gemini-3.0-pro-preview-001', limit: 10 },
            { id: 'gemini-3.0-flash', limit: 30 },
            { id: 'gemini-3.0-flash-preview-001', limit: 50 },

            // Gemini 2.5 Series
            { id: 'gemini-2.5-pro', limit: 10 },
            { id: 'gemini-2.5-flash', limit: 50 },
            { id: 'gemini-2.5-flash-image', limit: 20 },

            // Gemini 2.0 Series
            { id: 'gemini-2.0-flash', limit: 15 },
            { id: 'gemini-2.0-flash-001', limit: 25 },

            // Legacy / Standard Gemini
            { id: 'gemini-1.5-pro', limit: 2 },
            { id: 'gemini-1.5-flash', limit: 15 },

            // Imagen Series (Vision)
            { id: 'imagen-4.0-generate-001', limit: 5 },
            { id: 'imagen-3.0-generate-001', limit: 10 },
            { id: 'imagen-3.0', limit: 15 },

            // Veo Series (Video)
            { id: 'veo-3.1-generate-001', limit: 1 },
            { id: 'veo-2.0-generate-001', limit: 1 },
            { id: 'veo-2.0', limit: 2 },

            // Music Series (Audio Engine)
            { id: 'music-fx-default', limit: 30 },

            // MedLM (Specialized)
            { id: 'medlm-medium', limit: 2 },
            { id: 'medlm-large', limit: 1 },

            // Proxy / Competitive Support
            { id: 'claude-opus-4.5', limit: 5 },
            { id: 'claude-sonnet-4', limit: 15 }
        ];

        let changed = false;
        // ONLY apply default model list to Standard accounts
        // Antigravity and 11labs accounts use specialized logic
        if (account.accountType === 'standard' || account.accountType === '11labs-direct') {
            const limitScale = account.accountType === '11labs-direct' ? 99999 : 1;
            for (const model of defaultModels) {
                const safeId = this.sanitizeModelId(model.id);
                if (!account.quotas.has(safeId)) {
                    account.quotas.set(safeId, {
                        used: 0,
                        limit: account.accountType === '11labs-direct' ? 999999 : model.limit
                    });
                    changed = true;
                }
            }
        }

        if (changed) {
            await account.save();
        }

        // Also sync available models if Antigravity (This will handle pruning of defaults if they existed)
        if (account.accountType === 'antigravity') {
            await this.syncAvailableModels(account);
        }
    }
}

export const aiAccountManager = AIAccountManager.getInstance();
