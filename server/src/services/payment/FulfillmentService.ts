import crypto from 'crypto';
import { ITransaction, Transaction, TransactionStatus, TransactionType } from '~/models/Transaction.js';
import { CreditTransactionType, User } from '~/models/User.js';
import { License, LicenseStatus } from '~/models/License.js';
import { LicensePackage } from '~/models/LicensePackage.js';
import { TenantBillingCycle } from '~/models/Tenant.js';
import { Logger } from '~/utils/Logger.js';

/**
 * Atomically moves a gateway transaction from pending to completed.
 * Returns the transaction only for the single caller that performed the transition, so
 * concurrent redirect / verify / webhook deliveries can't fulfill the same payment twice.
 */
export async function claimTransactionCompletion(gatewayTransactionId: string): Promise<ITransaction | null> {
    return Transaction.findOneAndUpdate(
        { gatewayTransactionId, status: { $nin: [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED] } },
        { $set: { status: TransactionStatus.COMPLETED } },
        { new: true }
    );
}

function addBillingPeriod(base: Date, billingPeriod: string): Date {
    const end = new Date(base);
    if (billingPeriod === TenantBillingCycle.MONTHLY) end.setMonth(end.getMonth() + 1);
    else if (billingPeriod === TenantBillingCycle.YEARLY) end.setFullYear(end.getFullYear() + 1);
    return end;
}

/**
 * Grants what a completed transaction paid for (credits, license renewal or new license).
 * Call only with a transaction returned by claimTransactionCompletion.
 */
export async function fulfillTransaction(tx: ITransaction): Promise<void> {
    if (tx.type === TransactionType.CREDIT_PURCHASE) {
        const credits = Number(tx.metadata?.credits);
        if (!credits) return;
        await User.updateOne(
            { _id: tx.userId },
            {
                $inc: { 'credits.balance': credits },
                $push: {
                    creditLogs: {
                        type: CreditTransactionType.OBTAINED,
                        amount: credits,
                        description: 'Credit Package Purchase',
                        timestamp: new Date()
                    }
                }
            }
        );
        return;
    }

    const { packageId, licenseKey } = tx.metadata || {};
    const pkg = await LicensePackage.findById(packageId);
    if (!pkg) {
        Logger.error(`[Fulfillment] License package ${packageId} not found for transaction ${tx._id}`, 'Payment');
        return;
    }

    if (licenseKey) {
        const lic = await License.findOne({ key: licenseKey });
        if (lic) {
            const base = lic.endDate > new Date() ? lic.endDate : new Date();
            lic.endDate = addBillingPeriod(base, pkg.billingPeriod);
            lic.tier = pkg.tier; // Handle upgrade scenario
            await lic.save();
        }
        return;
    }

    // Licenses are looked up by owner email (see routes/license.ts)
    const user = await User.findById(tx.userId).select('email');
    const startDate = new Date();
    const key = 'LIC-' + crypto.randomBytes(8).toString('hex').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    await License.create({
        key,
        owner: user?.email || tx.userId.toString(),
        tier: pkg.tier,
        instancesLimit: pkg.limits.instances,
        maxUsersPerInstance: pkg.limits.usersPerInstance,
        startDate,
        endDate: addBillingPeriod(startDate, pkg.billingPeriod),
        status: LicenseStatus.VALID
    });
}
