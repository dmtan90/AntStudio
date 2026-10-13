/**
 * Smoke test for the Google Flow (flow.google.com) and Antigravity integrations with real accounts.
 * Adapted from openvideo/apps/shine flow-smoke.ts / flow-adapter-smoke.ts.
 *
 * Usage (from server/):
 *   pnpm smoke:ai                                   accounts stored in MongoDB (admin > AI accounts)
 *   FLOW_COOKIES_FILE=cookies.txt pnpm smoke:ai     Flow cookies from a file instead of the DB
 *
 * Env:
 *   SMOKE_TARGETS            flow,antigravity (default: both)
 *   FLOW_COOKIES_FILE        file with the flow.google.com cookies ("a=b; c=d" header or a JSON export)
 *   FLOW_ACCOUNT_EMAIL       Flow account from the DB to use (default: first active Google Flow account)
 *   FLOW_PROJECT_ID          reuse this Flow project instead of the account's / a new one
 *   FLOW_SMOKE_LEVEL         read  -> cookies, credits, project (default, spends nothing)
 *                            image -> + one image, upload, and the FlowAdapter image path (DB account)
 *                            full  -> + one text-to-video (spends Flow credits)
 *   ANTIGRAVITY_ACCOUNT_EMAIL  Antigravity account to use (default: first active one)
 *   SMOKE_OUT                folder for results.json and downloaded media (default ./ai-smoke-out)
 *
 * Needs MongoDB (MONGODB_URI) for stored accounts and the captcha settings (admin > API configs);
 * the "read" level with FLOW_COOKIES_FILE works without it. Cookies and tokens are never printed.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import axios from 'axios';
import mongoose from 'mongoose';
import { EnvConfig } from '../utils/ConfigService.js';
import { connectDB } from '../utils/db.js';
import { AIAccount, AIAccountType, IAIAccount } from '../models/AIAccount.js';
import {
    flowFrontendClient, flowBrowserHeaders, missingFlowCookies, FlowRequestContext, FLOW_ORIGIN, FLOW_DEFAULT_USER_AGENT
} from '../utils/ai/providers/FlowFrontendClient.js';
import { flowRequestContext } from '../utils/ai/FlowSyncService.js';
import { captchaService } from '../utils/ai/CaptchaService.js';
import { flowAdapter } from '../utils/ai/providers/FlowAdapter.js';
import { AntigravityClient } from '../integrations/ai/AntigravityClient.js';
import { antigravityModelSelector } from '../integrations/ai/AntigravityModelSelector.js';
import { aiAccountManager } from '../utils/ai/AIAccountManager.js';

type Result = { step: string; ok: boolean; ms: number; detail: string };
const results: Result[] = [];
const targets = (process.env.SMOKE_TARGETS || 'flow,antigravity').toLowerCase().split(',').map(s => s.trim());
const level = (process.env.FLOW_SMOKE_LEVEL || 'read').toLowerCase();
const outDir = path.resolve(process.env.SMOKE_OUT || 'ai-smoke-out');

async function step<T>(name: string, fn: () => Promise<T>, describe: (value: T) => string = v => String(v)): Promise<T | undefined> {
    const started = Date.now();
    try {
        let value: T;
        // Low reCAPTCHA scores are transient; retry with a fresh token like FlowAdapter does
        for (let attempt = 1; ; attempt++) {
            try {
                value = await fn();
                break;
            } catch (err: any) {
                if (attempt >= 3 || !/UNUSUAL_ACTIVITY|recaptcha/i.test(`${err.message} ${err.code || ''}`)) throw err;
                console.log(`  ..   ${name}: ${err.message}, retrying (${attempt}/3)`);
            }
        }
        const detail = describe(value);
        results.push({ step: name, ok: true, ms: Date.now() - started, detail });
        console.log(`  OK   ${name} (${Date.now() - started}ms) ${detail}`);
        return value;
    } catch (err: any) {
        const detail = err.response?.data?.error?.message || err.message;
        results.push({ step: name, ok: false, ms: Date.now() - started, detail });
        console.log(`  FAIL ${name} (${Date.now() - started}ms) ${detail}`);
        return undefined;
    }
}

function skip(name: string, reason: string) {
    results.push({ step: name, ok: true, ms: 0, detail: `skipped: ${reason}` });
    console.log(`  --   ${name}: skipped (${reason})`);
}

async function ensureDb(): Promise<boolean> {
    if (mongoose.connection.readyState === 1) return true;
    try {
        await connectDB();
        return true;
    } catch (err: any) {
        console.log(`  --   MongoDB unavailable (${err.message}); stored accounts and captcha settings cannot be used`);
        return false;
    }
}

async function captcha(projectId: string, action: 'IMAGE_GENERATION' | 'VIDEO_GENERATION' | 'UPLOAD_IMAGE', userAgent: string): Promise<string> {
    const token = await captchaService.solve({ projectId, action, userAgent });
    if (!token) throw new Error(`captcha solve failed for ${action} (check admin > API configs > captcha)`);
    return token;
}

async function save(ctx: FlowRequestContext, name: string, url: string): Promise<Buffer> {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 180_000,
        headers: { ...flowBrowserHeaders(ctx), 'Referer': `${FLOW_ORIGIN}/` },
    });
    const buffer = Buffer.from(res.data);
    writeFileSync(path.join(outDir, name), buffer);
    return buffer;
}

async function waitVideo(ctx: FlowRequestContext, operations: Awaited<ReturnType<typeof flowFrontendClient.generateVideo>>['operations']): Promise<string> {
    let current = operations;
    for (let i = 0; i < 36; i++) { // up to 6 minutes
        await new Promise(r => setTimeout(r, 10_000));
        current = await flowFrontendClient.checkVideoStatus(ctx, current);
        const done = current.find(op => op.videoUrl);
        if (done?.videoUrl) return done.videoUrl;
        const failed = current.find(op => op.status === 'MEDIA_GENERATION_STATUS_FAILED');
        if (failed) throw new Error(`video failed: ${failed.errorCode}`);
    }
    throw new Error('video timeout after 6 minutes');
}

async function smokeFlow() {
    console.log(`\n[flow] level=${level}`);
    let account: IAIAccount | null = null;
    let ctx: FlowRequestContext;

    if (process.env.FLOW_COOKIES_FILE) {
        ctx = { cookies: readFileSync(process.env.FLOW_COOKIES_FILE, 'utf8').trim() };
        console.log('  using cookies from FLOW_COOKIES_FILE');
    } else {
        if (!await ensureDb()) return skip('flow', 'no FLOW_COOKIES_FILE and no database');
        const email = process.env.FLOW_ACCOUNT_EMAIL;
        account = await AIAccount.findOne({ accountType: AIAccountType.GOOGLE_FLOW, isActive: true, ...(email ? { email } : {}) });
        if (!account) return skip('flow', email ? `no active Flow account ${email}` : 'no active Google Flow account in the database');
        ctx = flowRequestContext(account);
        console.log(`  using stored account ${account.email} (status: ${account.status})`);
    }

    const missing = missingFlowCookies(ctx.cookies);
    const cookiesOk = await step('cookies complete', async () => {
        if (missing.length > 0) throw new Error(`missing ${missing.join(', ')} - export all flow.google.com cookies again`);
        return 'OSID + Google account cookies present';
    });
    if (!cookiesOk) return;

    await step('credits (nzlxg)', () => flowFrontendClient.getCredits(ctx), c => `credits=${c}`);
    const projectId = process.env.FLOW_PROJECT_ID || account?.projectId || await step('create project (jHPbke)',
        () => flowFrontendClient.createProject(ctx, `AntStudio smoke ${new Date().toISOString()}`),
        id => flowFrontendClient.projectPageUrl(id));
    if (!projectId || level === 'read') return;

    if (!await ensureDb()) return skip('flow image/video', 'captcha settings need the database');
    const userAgent = ctx.userAgent || FLOW_DEFAULT_USER_AGENT;

    const image = await step('image BELUGA landscape (ogiZ0b)', async () => {
        const token = await captcha(projectId, 'IMAGE_GENERATION', userAgent);
        const items = await flowFrontendClient.generateImage(ctx, {
            projectId, prompt: 'A red fox sitting in a snowy forest, cinematic light', modelName: 'BELUGA',
            aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE', recaptchaToken: token,
        });
        const buffer = await save(ctx, 'flow_image.jpg', items[0].url);
        return { mediaId: items[0].mediaId, buffer };
    }, m => `mediaId=${m.mediaId} bytes=${m.buffer.length}`);

    if (image) {
        await step('upload image (maseQ)', async () => {
            const token = await captcha(projectId, 'UPLOAD_IMAGE', userAgent);
            return flowFrontendClient.uploadImage(ctx, projectId, image.buffer, 'image/jpeg', token);
        }, id => `mediaId=${id}`);
    }

    if (account) {
        await step('FlowAdapter.generateImage (app path)', async () => {
            const result = await flowAdapter.generateImage(account!, 'A lighthouse on a cliff, golden hour', 'gemini-3.1-flash-image', { aspectRatio: '16:9' });
            if (!result.buffer) throw new Error('no image bytes (download with browser headers failed)');
            writeFileSync(path.join(outDir, 'flow_adapter_image.jpg'), result.buffer);
            return result.buffer.length;
        }, bytes => `bytes=${bytes}`);
    } else {
        skip('FlowAdapter.generateImage (app path)', 'needs a stored account (unset FLOW_COOKIES_FILE)');
    }
    if (level !== 'full') return;

    await step('video veo t2v fast landscape (YhhmEf)', async () => {
        const token = await captcha(projectId, 'VIDEO_GENERATION', userAgent);
        const submission = await flowFrontendClient.generateVideo(ctx, {
            projectId, prompt: 'Ocean waves crashing on rocks at sunset', modelKey: 'veo_3_1_t2v_fast',
            aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE', recaptchaToken: token, mode: 'text',
        });
        const url = submission.videoUrl || await waitVideo(ctx, submission.operations);
        const buffer = await save(ctx, 'flow_video.mp4', url);
        return `bytes=${buffer.length}`;
    });
    await step('credits after (nzlxg)', () => flowFrontendClient.getCredits(ctx), c => `credits=${c}`);
}

async function smokeAntigravity() {
    console.log('\n[antigravity]');
    if (!await ensureDb()) return skip('antigravity', 'accounts are stored in the database');
    const email = process.env.ANTIGRAVITY_ACCOUNT_EMAIL;
    const account = await AIAccount.findOne({ accountType: AIAccountType.ANTIGRAVITY, isActive: true, ...(email ? { email } : {}) });
    if (!account) return skip('antigravity', email ? `no active Antigravity account ${email}` : 'no active Antigravity account in the database');
    console.log(`  using stored account ${account.email} (status: ${account.status})`);

    const client = new AntigravityClient(account);
    const token = await step('refresh OAuth token', () => aiAccountManager.refreshAccessToken(account), () => 'ok');
    if (!token) return;
    const projectId = await step('discover project (loadCodeAssist)', () => aiAccountManager.discoverProjectId(account), id => id || '(none, gateway default)');

    const models = await step('list models (fetchAvailableModels)', () => client.fetchAvailableModels(), list => `${list.length} models`);
    if (models) {
        writeFileSync(path.join(outDir, 'antigravity_models.json'), JSON.stringify(models, null, 2));
    }
    const requested = EnvConfig.geminiModelTextAnalysis;
    await step(`model for "${requested}" (ANTIGRAVITY_MODEL=${EnvConfig.antigravityModel})`,
        () => antigravityModelSelector.resolve(token, projectId || 'aicode-consumers', requested, true));

    await step('generateContent text', async () => {
        const { text } = await client.generateContent('Reply with exactly: pong', requested);
        if (!text.trim()) throw new Error('empty answer');
        return text.trim().slice(0, 60);
    });
    await step('generateContent JSON', async () => {
        const { text } = await client.generateContent('Return {"status":"ok","n":3}', requested, { jsonMode: true });
        const parsed = JSON.parse(text.replace(/^```json\s*|```$/g, '').trim());
        if (parsed.status !== 'ok') throw new Error(`unexpected JSON: ${text.slice(0, 80)}`);
        return 'valid JSON';
    });
}

async function main() {
    mkdirSync(outDir, { recursive: true });
    console.log(`[ai-smoke] targets=${targets.join(',')} out=${outDir}`);
    if (targets.includes('flow')) await smokeFlow();
    if (targets.includes('antigravity')) await smokeAntigravity();
}

main()
    .catch((err) => {
        console.error(`[ai-smoke] FAILED: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
        const failed = results.filter(r => !r.ok).length;
        console.log(`\n[ai-smoke] ${results.length - failed}/${results.length} steps passed -> ${path.join(outDir, 'results.json')}`);
        if (failed > 0) process.exitCode = 1;
        setTimeout(() => process.exit(), 500);
    });
