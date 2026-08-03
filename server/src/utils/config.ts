import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import { execSync } from 'child_process';

// ESM-compatible require — works in both tsx (dev) and esbuild output (prod)
const _require = createRequire(import.meta.url);

// Handling __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standalone & Dev Multi-location .env loader
const possibleEnvPaths = [
    process.env.ENV_PATH,
    path.join(process.cwd(), '.env'),
    path.join(path.dirname(process.execPath), '.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
].filter(Boolean) as string[];

for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
    }
}

// Resolve GOOGLE_APPLICATION_CREDENTIALS to absolute path if relative
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const filename = path.basename(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const execDir = path.dirname(process.execPath);
    const resourcesDir = (process as any).resourcesPath || path.join(execDir, 'resources');

    const candidatePaths = [
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        path.resolve(resourcesDir, filename),
        path.resolve(resourcesDir, process.env.GOOGLE_APPLICATION_CREDENTIALS),
        path.resolve(execDir, filename),
        path.resolve(process.cwd(), filename),
        path.resolve(process.cwd(), '..', filename)
    ];

    for (const candidate of candidatePaths) {
        if (candidate && fs.existsSync(candidate)) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = candidate;
            break;
        }
    }
}

// Helper to resolve unpacked binary paths when running inside Electron app.asar
const resolveUnpackedPath = (binPath: string) => {
    if (binPath && binPath.includes('app.asar')) {
        const unpackedPath = binPath.replace('app.asar', 'app.asar.unpacked');
        if (fs.existsSync(unpackedPath)) {
            return unpackedPath;
        }
    }
    return binPath;
};

// Helper to find a binary via the system PATH using `where` (Windows) or `which` (Unix).
const findOnPath = (binaryName: string): string | null => {
    try {
        const cmd = process.platform === 'win32' ? `where ${binaryName}` : `which ${binaryName}`;
        const result = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
        // `where` may return multiple lines; take the first one
        const first = result.split(/\r?\n/)[0].trim();
        if (first && fs.existsSync(first)) return first;
    } catch {
        // Binary not on PATH
    }
    return null;
};

// Safe ffmpeg/ffprobe path resolution.
// @ffmpeg-installer/ffmpeg throws at import time if the binary doesn't exist at the
// asar-internal path, so we resolve paths manually and handle asar.unpacked ourselves.
const resolveFfmpegPath = (): string => {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
    try {
        // ESM-compatible require via createRequire
        const installer = _require('@ffmpeg-installer/ffmpeg');
        return resolveUnpackedPath(installer.path);
    } catch {
        // Fallback: construct the unpacked path manually based on platform
        const platform = process.platform;
        const arch = process.arch;
        const platformKey = `${platform}-${arch}`;
        const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        const candidates = [
            // Inside asar.unpacked (Electron packaged)
            path.join(__dirname, `../../../node_modules/@ffmpeg-installer/${platformKey}/${binaryName}`),
            path.join(__dirname, `../../../../app.asar.unpacked/node_modules/@ffmpeg-installer/${platformKey}/${binaryName}`),
            // System-installed (Unix)
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg',
            '/usr/local/ffmpeg/bin/ffmpeg',
            // Common Windows install locations
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
        // Last resort: search system PATH
        const onPath = findOnPath('ffmpeg');
        if (onPath) return onPath;
        console.warn('[Config] ffmpeg binary not found in any candidate path. Falling back to bare command name.');
        return 'ffmpeg'; // fallback to PATH
    }
};

const resolveFfprobePath = (): string => {
    if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
    try {
        const installer = _require('@ffprobe-installer/ffprobe');
        return resolveUnpackedPath(installer.path);
    } catch {
        const platform = process.platform;
        const arch = process.arch;
        const platformKey = `${platform}-${arch}`;
        const binaryName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
        const candidates = [
            path.join(__dirname, `../../../node_modules/@ffprobe-installer/${platformKey}/${binaryName}`),
            path.join(__dirname, `../../../../app.asar.unpacked/node_modules/@ffprobe-installer/${platformKey}/${binaryName}`),
            '/usr/bin/ffprobe',
            '/usr/local/bin/ffprobe',
            '/usr/local/ffmpeg/bin/ffprobe',
            'C:\\ffmpeg\\bin\\ffprobe.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
            'C:\\Program Files (x86)\\ffmpeg\\bin\\ffprobe.exe',
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
        const onPath = findOnPath('ffprobe');
        if (onPath) return onPath;
        console.warn('[Config] ffprobe binary not found in any candidate path. Falling back to bare command name.');
        return 'ffprobe';
    }
};

export const config = {
    // Registry & Business Mode
    systemMode: process.env.SYSTEM_MODE || 'edge', // 'master' or 'edge'
    masterServerUrl: process.env.MASTER_SERVER_URL || 'https://antstudio.agrhub.com',

    // Private keys
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
    
    // Storage config
    storageProvider: process.env.STORAGE_PROVIDER || 's3',//b2 or drive
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsS3Bucket: process.env.AWS_S3_BUCKET || 'antstudio-assets',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsS3Endpoint: process.env.AWS_S3_ENDPOINT,
    blazeB2AppId: process.env.BLAZE_B2_APPLICATION_ID,
    blazeB2AppKey: process.env.BLAZE_B2_APPLICATION_KEY,
    blazeB2BucketName: process.env.BLAZE_B2_BUCKET_NAME || 'antstudio-assets',

    // Payment config
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    paypalSecret: process.env.PAYPAL_CLIENT_SECRET,
    paypalWebhookSecret: process.env.PAYPAL_WEBHOOK_SECRET,
    
    // Email config
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    smtpFromName: process.env.SMTP_FROM_NAME || "AntStudio",

    // Youtube OAuth config
    // youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    // youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    // youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,

    // Google OAuth config
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
    
    // Facebook OAuth config
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    facebookRedirectUri: process.env.FACEBOOK_REDIRECT_URI,

    // Facebook OAuth config
    tiktokClientKey: process.env.TIKTOK_CLIENT_KEY,
    tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET,
    tiktokRedirectUri: process.env.TIKTOK_REDIRECT_URI,

    // Gemini Models Config
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiApiKeys: process.env.GEMINI_API_KEYS,
    geminiModelTextAnalysis: process.env.GEMINI_MODEL_TEXT_ANALYSIS || 'gemini-3.1-flash-lite',
    geminiModelImageGeneration: process.env.GEMINI_MODEL_IMAGE_GENERATION || 'gemini-3.1-flash-lite-image',
    geminiModelVideoGeneration: process.env.GEMINI_MODEL_VIDEO_GENERATION || 'veo-3.1-generate-preview',
    geminiModelTTS: process.env.GEMINI_MODEL_TTS || 'gemini-3.1-flash-tts-preview',
	geminiModelVoice: process.env.GEMINI_MODEL_VOICE || 'gemini-3.1-flash-live-preview',
	geminiModelMusic: process.env.GEMINI_MODEL_MUSIC || 'lyria-3-clip-preview',
    geminiModelAgent: process.env.GEMINI_MODEL_AGENT || 'gemini-3.1-flash-lite',

    //GCP project config
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
    googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION,
    googleGenaiUseVertexAI: process.env.GOOGLE_GENAI_USE_VERTEXAI,
    // gcpApiKey: process.env.GOOGLE_API_KEY,
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,

    // Assets config
    giphyApiKey: process.env.GIPHY_API_KEY,
    pexelsApiKey: process.env.PEXELS_API_KEY,
    unsplashApiKey: process.env.UNSPLASH_API_KEY,

    // FFmpeg & FFprobe
    ffmpegPath: resolveFfmpegPath(),
    ffprobePath: resolveFfprobePath(),

    // Public keys (matching Nuxt public config)
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    
    //app port
    clientPort: process.env.CLIENT_PORT || '3000',
    serverPort: process.env.PORT || '5000',
};

export default config;
