import { AIAccount, AIAccountStatus, AIAccountType, IAIAccount } from '../../models/AIAccount.js';
import { Logger } from '../Logger.js';
import { flowFrontendClient, FlowRequestContext, FlowRpcError, missingFlowCookies } from './providers/FlowFrontendClient.js';

/**
 * Google Flow account sync (flow.google.com).
 *
 * Google retired the Labs session endpoint (labs.google/fx/api/auth/session) that turned the
 * next-auth session token into a bearer token, and the aisandbox-pa REST API that used it. Flow now
 * authenticates every request with the Google account cookies, so:
 *   - `flowST` holds the full Google cookie storage of the account (a "Cookie:" header string or a
 *     browser cookie JSON export), not the next-auth session token any more
 *   - `flowAT` only records that the cookies were validated (FLOW_FRONTEND_ACCESS_TOKEN)
 * Ported from openvideo/apps/shine (FlowSyncService).
 */
export const FLOW_FRONTEND_ACCESS_TOKEN = 'flow-frontend-cookie';

/** Request context for an account: its cookies and the browser fingerprint they were captured with. */
export function flowRequestContext(account: IAIAccount): FlowRequestContext {
    const fp = account.lastFingerprint;
    return {
        cookies: account.flowST || '',
        userAgent: fp?.get('user_agent') || undefined,
        acceptLanguage: fp?.get('accept_language') || undefined,
        secChUa: fp?.get('sec_ch_ua') || undefined,
        secChUaMobile: fp?.get('sec_ch_ua_mobile') || undefined,
        secChUaPlatform: fp?.get('sec_ch_ua_platform') || undefined,
    };
}

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
     * Start the background sync process
     */
    public start() {
        // Run every 30 minutes
        setInterval(() => void this.syncAllAccounts(), 30 * 60 * 1000);
        void this.syncAllAccounts();
    }

    /**
     * Sync all Google Flow accounts
     */
    public async syncAllAccounts() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        Logger.info('[FlowSyncService] Starting background sync for Google Flow accounts...');

        try {
            const accounts = await AIAccount.find({ accountType: AIAccountType.GOOGLE_FLOW, isActive: true });
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

    private async markUnauthorized(account: IAIAccount, reason: string): Promise<void> {
        account.status = AIAccountStatus.UNAUTHORIZED;
        account.flowAT = undefined;
        account.flowATExpiresAt = undefined;
        account.errorMessage = reason;
        await account.save();
    }

    /**
     * Validate the account's Google cookies against flow.google.com and refresh credits / project.
     * Returns true when the account is usable. (Name kept for callers; there is no ST -> AT exchange
     * on the new domain.)
     */
    public async refreshAccountTokens(account: IAIAccount): Promise<boolean> {
        const cookies = account.flowST;
        if (!cookies) {
            Logger.warn(`[FlowSyncService] No Google cookies for ${account.email}. Skipping refresh.`);
            return false;
        }

        const missing = missingFlowCookies(cookies);
        if (missing.length > 0) {
            const reason = `Google cookies are incomplete for flow.google.com, missing: ${missing.join(', ')}. `
                + 'Export all cookies of flow.google.com (including .google.com) and paste them again.';
            Logger.warn(`[FlowSyncService] ${account.email}: ${reason}`);
            await this.markUnauthorized(account, reason);
            return false;
        }

        try {
            const credits = await flowFrontendClient.getCredits(flowRequestContext(account));

            account.credits = credits;
            account.flowAT = FLOW_FRONTEND_ACCESS_TOKEN;
            account.flowATExpiresAt = new Date(Date.now() + 55 * 60 * 1000);
            account.status = AIAccountStatus.READY;
            account.errorMessage = undefined;

            await this.ensureProject(account);
            await account.save();
            Logger.info(`[FlowSyncService] ${account.email} synced (credits: ${credits}, project: ${account.projectId})`);
            return true;
        } catch (err: any) {
            const message = err?.message || String(err);
            Logger.error(`[FlowSyncService] Cookie validation failed for ${account.email}:`, message);
            if (err instanceof FlowRpcError && err.isAuthError) {
                await this.markUnauthorized(account, message);
            }
            // Not rethrown: background sync must keep going with the other accounts
            return false;
        }
    }

    /**
     * Called when a generation request hits 401: an admin may have pasted fresh cookies since this
     * account document was loaded, so reload it and validate those.
     */
    public async recoverAccountCookies(account: IAIAccount): Promise<boolean> {
        try {
            const fresh = await AIAccount.findById(account._id).select('flowST lastFingerprint projectId');
            if (!fresh?.flowST || fresh.flowST === account.flowST) return false;
            account.flowST = fresh.flowST;
            if (fresh.lastFingerprint) account.lastFingerprint = fresh.lastFingerprint;
            if (fresh.projectId) account.projectId = fresh.projectId;
            return await this.refreshAccountTokens(account);
        } catch (err: any) {
            Logger.warn(`[FlowSyncService] Cookie recovery failed for ${account.email}: ${err.message}`);
            return false;
        }
    }

    /**
     * Ensure a Flow project exists for the account, creating one when missing (or when forced).
     */
    public async ensureProject(account: IAIAccount, forceNew = false): Promise<string> {
        if (account.projectId && !forceNew) {
            return account.projectId;
        }
        Logger.info(`[FlowSyncService] Project ID missing or renewing for ${account.email}. Creating one...`);
        return this.createNewProject(account);
    }

    public async createNewProject(account: IAIAccount): Promise<string> {
        if (!account.flowST) {
            throw new Error(`Cannot create a Flow project for ${account.email}: missing Google cookies`);
        }
        const title = `AntStudio - ${account.email.split('@')[0]} - ${Date.now()}`;
        const projectId = await flowFrontendClient.createProject(flowRequestContext(account), title);

        account.projectId = projectId;
        await account.save();
        Logger.info(`[FlowSyncService] Created Flow project for ${account.email}: ${projectId}`);
        return projectId;
    }
}

export const flowSyncService = FlowSyncService.getInstance();
