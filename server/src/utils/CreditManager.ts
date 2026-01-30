import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { CreditUsage } from '../models/CreditUsage.js';
import { systemLogger } from './systemLogger.js';

export type ServiceType = 'streaming' | 'ai_translation' | 'face_swap' | 'storage' | 'image' | 'audio' | 'video' | 'text' | 'marketplace' | 'custom';

/**
 * Utility to handle credit deductions and usage auditing.
 * Essential for the B2B Resale Economy.
 */
export const creditManager = {
    /**
     * Deducts credits from a user and logs the transaction.
     * @returns boolean true if successful, false if insufficient credits
     */
    async deductCredits(
        userId: string,
        serviceType: ServiceType,
        amount: number,
        description: string,
        metadata: any = {}
    ): Promise<boolean> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 0. Fetch User
            const user = await User.findById(userId).session(session);
            if (!user) {
                console.error(`[CreditManager] User not found: ${userId}`);
                await session.abortTransaction();
                return false;
            }

            // 1. Resolve Tenant Context
            const tenant = await Tenant.findById(user.tenantId).session(session);
            if (!tenant) {
                console.error(`[CreditManager] Tenant not found: ${user.tenantId}`);
                await session.abortTransaction();
                return false;
            }

            // 2. Hierarchical Deduction (Sub-Enterprise Logic)
            if (tenant.tenantType === 'sub' && tenant.organizationPool) {
                const available = tenant.organizationPool.total - tenant.organizationPool.used;
                const canSpend = available + tenant.organizationPool.negativeLimit;

                if (canSpend >= amount) {
                    // Organization Pool has enough
                    tenant.organizationPool.used += amount;
                    await tenant.save({ session });

                    // Create B2B Audit Record (Org Level)
                    await CreditUsage.create([{
                        tenantId: user.tenantId,
                        userId: user._id,
                        serviceType,
                        creditsConsumed: amount,
                        description: `[ORG POOL] ${description}`,
                        metadata: { ...metadata, isOrgPool: true },
                        timestamp: new Date()
                    }], { session });

                    await session.commitTransaction();
                    console.log(`[CreditManager] Deduced ${amount} from ORG POOL of ${tenant.name}`);
                    return true;
                }
                // If org pool empty, waterfall to individual user credits? 
                // As per requirement: "credit này sẽ bị trừ dần khi các tài khoản trong nội bộ sử dụng"
                // This implies it stops if pool is empty unless master allows individual top-ups.
                // For now, let's strictly enforce the Org Pool if it's a Sub-Enterprise.
                console.warn(`[CreditManager] ORG POOL exhausted for ${tenant.name}`);
                await session.abortTransaction();
                return false;
            }

            // 3. Fallback to Individual User Balance (Standard SaaS / Master Users)
            if (user.credits.balance < amount) {
                console.warn(`[CreditManager] Insufficient credits for user ${userId}. Needed: ${amount}, Have: ${user.credits.balance}`);
                await session.abortTransaction();
                return false;
            }

            // Update User Balance
            user.credits.balance -= amount;
            user.creditLogs.push({
                type: 'consumed',
                amount: amount,
                description: `${description} (${serviceType})`,
                timestamp: new Date()
            });
            await user.save({ session });

            // Create B2B Audit Record
            await CreditUsage.create([{
                tenantId: user.tenantId,
                userId: user._id,
                serviceType,
                creditsConsumed: amount,
                description,
                metadata,
                timestamp: new Date()
            }], { session });

            await session.commitTransaction();

            console.log(`[CreditManager] Deduced ${amount} credits from user ${userId} for ${serviceType}`);
            return true;

        } catch (error: any) {
            await session.abortTransaction();

            // Handle "Transaction numbers are only allowed on a replica set member"
            if (error.code === 20 || error.message.includes('replica set')) {
                // systemLogger.warn('Transactions not supported (Standalone MongoDB). Falling back to non-transactional deduction.', 'CreditManager');
                return await this.deductCreditsNonTransactional(userId, serviceType, amount, description, metadata);
            }

            console.error('[CreditManager] Deduction failed:', error);
            systemLogger.error(`Credit deduction failed: ${error.message}`, 'CreditManager');
            return false;
        } finally {
            session.endSession();
        }
    },

    /**
     * Fallback for Standalone MongoDB
     */
    async deductCreditsNonTransactional(userId: string, serviceType: ServiceType, amount: number, description: string, metadata: any): Promise<boolean> {
        try {
            const user = await User.findById(userId);
            if (!user || user.credits.balance < amount) return false;

            user.credits.balance -= amount;
            user.creditLogs.push({
                type: 'consumed',
                amount: amount,
                description: `${description} (${serviceType})`,
                timestamp: new Date()
            });
            await user.save();
            return true;
        } catch (e) { return false; }
    },

    /**
     * Refunds credits to a user (e.g. on task failure).
     */
    async refundCredits(
        userId: string,
        serviceType: ServiceType,
        amount: number,
        description: string
    ) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            user.credits.balance += amount;
            user.creditLogs.push({
                type: 'obtained',
                amount: amount,
                description: `REFUND: ${description}`,
                timestamp: new Date()
            });
            await user.save();

            // We could also add a record to CreditUsage with negative amount if needed for reporting

            console.log(`[CreditManager] Refunded ${amount} credits to user ${userId}`);
        } catch (error: any) {
            console.error('[CreditManager] Refund failed:', error);
        }
    }
};
