import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    transactionFindOneAndUpdate: vi.fn(),
    userUpdateOne: vi.fn(),
    userFindById: vi.fn(),
    licenseFindOne: vi.fn(),
    licenseCreate: vi.fn(),
    packageFindById: vi.fn()
}));

vi.mock('~/models/Transaction.js', () => ({
    Transaction: { findOneAndUpdate: mocks.transactionFindOneAndUpdate },
    TransactionStatus: { PENDING: 'pending', COMPLETED: 'completed', FAILED: 'failed', REFUNDED: 'refunded' },
    TransactionType: { CREDIT_PURCHASE: 'credit_purchase', LICENSE_PURCHASE: 'license_purchase', LICENSE_RENEWAL: 'license_renewal' }
}));
vi.mock('~/models/User.js', () => ({
    User: { updateOne: mocks.userUpdateOne, findById: mocks.userFindById },
    CreditTransactionType: { OBTAINED: 'obtained' }
}));
vi.mock('~/models/License.js', () => ({
    License: { findOne: mocks.licenseFindOne, create: mocks.licenseCreate },
    LicenseStatus: { VALID: 'valid' }
}));
vi.mock('~/models/LicensePackage.js', () => ({ LicensePackage: { findById: mocks.packageFindById } }));
vi.mock('~/models/Tenant.js', () => ({ TenantBillingCycle: { MONTHLY: 'monthly', YEARLY: 'yearly' } }));
vi.mock('~/utils/Logger.js', () => ({ Logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

const { claimTransactionCompletion, fulfillTransaction } = await import('../src/services/payment/FulfillmentService.js');

beforeEach(() => {
    Object.values(mocks).forEach(m => m.mockReset());
});

describe('claimTransactionCompletion', () => {
    it('only transitions transactions that are not already completed or refunded', async () => {
        mocks.transactionFindOneAndUpdate.mockResolvedValue({ _id: 'tx1' });
        await claimTransactionCompletion('cs_123');

        expect(mocks.transactionFindOneAndUpdate).toHaveBeenCalledWith(
            { gatewayTransactionId: 'cs_123', status: { $nin: ['completed', 'refunded'] } },
            { $set: { status: 'completed' } },
            { new: true }
        );
    });

    it('returns null when another caller already completed it', async () => {
        mocks.transactionFindOneAndUpdate.mockResolvedValue(null);
        await expect(claimTransactionCompletion('cs_123')).resolves.toBeNull();
    });
});

describe('fulfillTransaction', () => {
    it('adds credits atomically with $inc and logs the purchase', async () => {
        await fulfillTransaction({ type: 'credit_purchase', userId: 'u1', metadata: { credits: 500 } } as any);

        expect(mocks.userUpdateOne).toHaveBeenCalledTimes(1);
        const [filter, update] = mocks.userUpdateOne.mock.calls[0];
        expect(filter).toEqual({ _id: 'u1' });
        expect(update.$inc).toEqual({ 'credits.balance': 500 });
        expect(update.$push.creditLogs).toMatchObject({ type: 'obtained', amount: 500 });
    });

    it('creates new licenses owned by the buyer email', async () => {
        mocks.packageFindById.mockResolvedValue({ tier: 'pro', billingPeriod: 'monthly', limits: { instances: 2, usersPerInstance: 5 } });
        mocks.userFindById.mockReturnValue({ select: () => Promise.resolve({ email: 'buyer@example.com' }) });

        await fulfillTransaction({ type: 'license_purchase', userId: 'u1', metadata: { packageId: 'p1' } } as any);

        expect(mocks.licenseCreate).toHaveBeenCalledTimes(1);
        const license = mocks.licenseCreate.mock.calls[0][0];
        expect(license.owner).toBe('buyer@example.com');
        expect(license.tier).toBe('pro');
        expect(license.endDate.getTime()).toBeGreaterThan(license.startDate.getTime());
    });

    it('extends an existing license from its current end date on renewal', async () => {
        const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        const lic = { endDate: futureEnd, tier: 'basic', save: vi.fn() };
        mocks.packageFindById.mockResolvedValue({ tier: 'pro', billingPeriod: 'yearly', limits: {} });
        mocks.licenseFindOne.mockResolvedValue(lic);

        await fulfillTransaction({ type: 'license_renewal', userId: 'u1', metadata: { packageId: 'p1', licenseKey: 'LIC-1' } } as any);

        const expected = new Date(futureEnd);
        expected.setFullYear(expected.getFullYear() + 1);
        expect(lic.endDate.getTime()).toBe(expected.getTime());
        expect(lic.tier).toBe('pro');
        expect(lic.save).toHaveBeenCalled();
    });
});
