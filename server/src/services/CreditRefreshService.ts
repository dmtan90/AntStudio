import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { systemLogger } from '../utils/systemLogger.js';

/**
 * Service to handle automated monthly credit refreshes and usage resets.
 * Essential for the B2B Reseller economy.
 */
export const creditRefreshService = {
    async processRefreshes() {
        try {
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getUTCMonth();
            const currentYear = now.getUTCFullYear();

            // 1. Find all active Tenants where today is their refresh day
            // and they haven't been reset this month yet.
            const tenantsToRefresh = await Tenant.find({
                'license.status': 'active',
                'resaleConfig.enabled': true,
                'resaleConfig.refreshDay': currentDay
                // Note: In production, we'd check usage.lastReset to ensure month-level precision
            });

            if (tenantsToRefresh.length === 0) return;

            console.log(`[CreditService] Processing refreshes for ${tenantsToRefresh.length} tenants...`);

            for (const tenant of tenantsToRefresh) {
                // Check if already reset this month
                const lastReset = tenant.usage.lastReset;
                if (lastReset &&
                    lastReset.getUTCMonth() === currentMonth &&
                    lastReset.getUTCFullYear() === currentYear) {
                    continue;
                }

                console.log(`[CreditService] Refreshing Tenant: ${tenant.name} (${tenant.subdomain})`);

                // 2. Refresh Tenant-level Usage & Org Pool
                (tenant as any).resetMonthlyUsage?.();

                if (tenant.tenantType === 'sub' && tenant.organizationPool) {
                    console.log(`[CreditService] Resetting Org Pool for ${tenant.name}`);
                    tenant.organizationPool.used = 0;
                    // Note: total is the hard cap, monthlyAllocation is what they get every month.
                    // We can either set total = monthlyAllocation or total += monthlyAllocation.
                    // Assuming total is the current balance, and monthlyAllocation is the refill amount.
                    tenant.organizationPool.total = tenant.organizationPool.monthlyAllocation;
                }

                // 3. Reset all Users of this Tenant
                const creditsConfig = tenant.resaleConfig?.credits || { free: 10, pro: 100, enterprise: 1000 };

                // Map User subscription plans to Tenant credit keys
                // User plans: 'free', 'pro', 'enterprise' (mapping 'starter/basic' to pro)

                const users = await User.find({ tenantId: tenant._id });

                for (const user of users) {
                    const plan = user.subscription.plan as string;
                    let allotment = creditsConfig.free;

                    if (plan === 'pro' || plan === 'basic' || plan === 'starter') {
                        allotment = creditsConfig.pro;
                    } else if (plan === 'enterprise') {
                        allotment = creditsConfig.enterprise;
                    }

                    user.credits.balance = allotment;
                    user.creditLogs.push({
                        type: 'obtained',
                        amount: allotment,
                        description: `Monthly Credit Refresh - ${plan.toUpperCase()}`,
                        timestamp: new Date()
                    });
                    await user.save();
                }

                tenant.usage.lastReset = new Date();
                await tenant.save();

                systemLogger.info(`Completed monthly credit refresh for tenant: ${tenant.name}`, 'CreditService');
            }

        } catch (error: any) {
            console.error('[CreditService] Error processing refreshes:', error);
            systemLogger.error(`Credit refresh failed: ${error.message}`, 'CreditService');
        }
    },

    startScheduler() {
        console.log('[CreditService] Starting allotment scheduler (Hourly check)...');

        // Run immediately on startup
        this.processRefreshes();

        // Run every hour
        setInterval(() => {
            this.processRefreshes();
        }, 60 * 60 * 1000);
    }
};
