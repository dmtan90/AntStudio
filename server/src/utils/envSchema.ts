import { z } from 'zod';

/**
 * Startup validation for environment configuration.
 * Values can also be overridden from the DB (EnvironmentManager), so run this after that.
 * Everything here is reported as a warning: startup behavior is unchanged, but misconfiguration
 * is visible in one place instead of surfacing later as a failed request.
 */

const optionalUrl = z.url({ protocol: /^https?$/ }).optional();
const optionalPort = z.string().regex(/^\d{1,5}$/, 'must be a port number').optional();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    PORT: optionalPort,
    RTMP_PORT: optionalPort,
    SMTP_PORT: optionalPort,
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
    JWT_SECRET: z.string().min(32, 'should be at least 32 characters (a random per-process secret is used otherwise)'),
    BASE_URL: optionalUrl,
    MASTER_SERVER_URL: optionalUrl,
    AWS_S3_ENDPOINT: optionalUrl,
    SYSTEM_MODE: z.enum(['master', 'edge']).optional(),
    STORAGE_PROVIDER: z.enum(['s3', 'b2', 'drive', 'local']).optional(),
    STORAGE_ACCESS_MODE: z.enum(['off', 'report', 'enforce']).optional(),
    SMTP_SECURE: z.enum(['true', 'false']).optional(),
    STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/, 'must be a Stripe secret key (sk_...)').optional(),
    STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/, 'must start with whsec_').optional()
});

/** Integrations that only work when all of their variables are set together. */
const REQUIRED_TOGETHER: Array<{ when: (env: NodeJS.ProcessEnv) => boolean; feature: string; vars: string[] }> = [
    { feature: 'S3 storage', when: env => (env.STORAGE_PROVIDER || 's3') === 's3', vars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] },
    { feature: 'B2 storage', when: env => env.STORAGE_PROVIDER === 'b2', vars: ['BLAZE_B2_APPLICATION_ID', 'BLAZE_B2_APPLICATION_KEY'] },
    { feature: 'Stripe payments', when: env => !!env.STRIPE_SECRET_KEY, vars: ['STRIPE_WEBHOOK_SECRET'] },
    { feature: 'SMTP email', when: env => !!env.SMTP_HOST, vars: ['SMTP_USER', 'SMTP_PASSWORD'] },
    { feature: 'Google OAuth', when: env => !!env.GOOGLE_CLIENT_ID, vars: ['GOOGLE_CLIENT_SECRET'] },
    { feature: 'Facebook OAuth', when: env => !!env.FACEBOOK_APP_ID, vars: ['FACEBOOK_APP_SECRET'] }
];

export function validateEnv(env: NodeJS.ProcessEnv = process.env): string[] {
    const warnings: string[] = [];

    // Treat empty strings as unset
    const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
    const result = envSchema.safeParse(cleaned);
    if (!result.success) {
        for (const issue of result.error.issues) {
            const key = issue.path.join('.');
            const message = issue.code === 'invalid_type' ? 'is not set' : issue.message;
            warnings.push(`${key} ${message}`);
        }
    }

    for (const group of REQUIRED_TOGETHER) {
        if (!group.when(cleaned)) continue;
        const missing = group.vars.filter(v => !cleaned[v]);
        if (missing.length > 0) warnings.push(`${group.feature} is enabled but ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} not set`);
    }

    return warnings;
}
