import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// Handling __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root .env if it exists, or from the current dir
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Registry & Business Mode
    systemMode: process.env.SYSTEM_MODE || 'edge', // 'master' or 'edge'
    masterServerUrl: process.env.MASTER_SERVER_URL || 'https://antstudio.agrhub.com',

    // Private keys
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsS3Bucket: process.env.AWS_S3_BUCKET || 'flova-assets',
    awsS3Endpoint: process.env.AWS_S3_ENDPOINT,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiApiKeys: process.env.GEMINI_API_KEYS,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    smtpFromName: process.env.SMTP_FROM_NAME,
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    facebookRedirectUri: process.env.FACEBOOK_REDIRECT_URI,

    // Gemini Models Config
    geminiModelTextAnalysis: process.env.GEMINI_MODEL_TEXT_ANALYSIS || 'gemini-3-flash-preview',
    geminiModelImageGeneration: process.env.GEMINI_MODEL_IMAGE_GENERATION || 'gemini-2.5-flash-image',
    geminiModelVideoGeneration: process.env.GEMINI_MODEL_VIDEO_GENERATION || 'veo-3.1-fast-generate-preview',
    geminiModelTts: process.env.GEMINI_MODEL_TTS || 'lyria-002',

    // FFmpeg & FFprobe
    ffmpegPath: process.env.FFMPEG_PATH || ffmpegInstaller.path,
    ffprobePath: process.env.FFPROBE_PATH || ffprobeInstaller.path,

    // Public keys (matching Nuxt public config)
    public: {
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    }
};

export default config;
