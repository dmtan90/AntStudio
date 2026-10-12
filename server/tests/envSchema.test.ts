import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/utils/envSchema.js';

const valid = {
    MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.net/antstudio',
    JWT_SECRET: 'x'.repeat(48),
    BASE_URL: 'https://antstudio.example.com',
    PORT: '4000',
    STORAGE_PROVIDER: 'local'
};

describe('validateEnv', () => {
    it('accepts a complete configuration', () => {
        expect(validateEnv(valid)).toEqual([]);
    });

    it('reports missing required values', () => {
        const warnings = validateEnv({ STORAGE_PROVIDER: 'local' });
        expect(warnings).toContain('MONGODB_URI is not set');
        expect(warnings).toContain('JWT_SECRET is not set');
    });

    it('treats empty strings as unset', () => {
        expect(validateEnv({ ...valid, JWT_SECRET: '' })).toContain('JWT_SECRET is not set');
    });

    it('reports invalid formats', () => {
        const warnings = validateEnv({ ...valid, PORT: 'abc', BASE_URL: 'not a url', MONGODB_URI: 'postgres://x', JWT_SECRET: 'short' });
        expect(warnings.some(w => w.startsWith('PORT'))).toBe(true);
        expect(warnings.some(w => w.startsWith('BASE_URL'))).toBe(true);
        expect(warnings.some(w => w.startsWith('MONGODB_URI must start with'))).toBe(true);
        expect(warnings.some(w => w.startsWith('JWT_SECRET should be at least 32'))).toBe(true);
    });

    it('reports integrations missing their companion variables', () => {
        const warnings = validateEnv({ ...valid, STORAGE_PROVIDER: 's3', AWS_ACCESS_KEY_ID: 'AKIA', STRIPE_SECRET_KEY: 'sk_test_123' });
        expect(warnings).toContain('S3 storage is enabled but AWS_SECRET_ACCESS_KEY is not set');
        expect(warnings).toContain('Stripe payments is enabled but STRIPE_WEBHOOK_SECRET is not set');
    });

    it('defaults to S3 storage when STORAGE_PROVIDER is unset', () => {
        const { STORAGE_PROVIDER, ...rest } = valid;
        expect(validateEnv(rest)).toContain('S3 storage is enabled but AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are not set');
    });
});
