import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { aiManager } from '../utils/ai/AIServiceManager.js';
import { ElevenLabsProvider } from '../utils/ai/providers/ElevenLabsProvider.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// Helper to get ElevenLabs provider
const getElevenLabs = async () => {
    const provider = await aiManager.getProvider('elevenlabs');
    if (!provider) {
        throw new Error('ElevenLabs provider not configured. Please add API Key.');
    }
    return provider;
};

// Helper to get Google TTS provider with standard account token
const getGoogleTTS = async () => {
    const provider = await aiManager.getProvider('google-tts');
    if (!provider) {
        throw new Error('Google TTS provider not initialized');
    }

    // Dynamic token sourcing from standard accounts
    const { aiAccountManager } = await import('../utils/ai/AIAccountManager.js');
    const account = await aiAccountManager.getOptimalAccount('audio');
    if (account && account.providerId === 'google') {
        const token = await aiAccountManager.refreshAccessToken(account);
        if (typeof (provider as any).updateClient === 'function') {
            (provider as any).updateClient({ 
                accessToken: token,
                projectId: account.projectId
            });
        }
    }

    return provider;
};

// GET /api/voice/list-all
// Aggregates voices from both providers
router.get('/list-all', async (req: AuthRequest, res) => {
    try {
        const { language } = req.query;
        const langStr = language ? String(language) : undefined;

        const [elevenProvider, googleProvider] = await Promise.all([
            getElevenLabs().catch(() => null),
            getGoogleTTS().catch(() => null)
        ]);

        const [elevenVoices, googleVoices] = await Promise.all([
            elevenProvider ? elevenProvider.listVoices().catch((err: any) => {
                console.error('ElevenLabs listVoices error:', err.message);
                return [];
            }) : Promise.resolve([]),
            googleProvider ? googleProvider.listVoices(langStr).catch((err: any) => {
                console.error('Google TTS listVoices error:', err.message);
                return [];
            }) : Promise.resolve([])
        ]);

        const formattedEleven = elevenVoices.map((v: any) => ({
            id: v.voice_id,
            name: v.name,
            provider: 'elevenlabs',
            category: v.category,
            preview_url: v.preview_url,
            language: 'Multi',
            gender: v.labels?.gender || 'neutral'
        }));

        const formattedGoogle = googleVoices.map((v: any) => ({
            id: v.name,
            name: v.name,
            provider: 'google',
            category: v.ssmlGender,
            preview_url: null, // Google doesn't provide preview URLs in listVoices easily
            language: v.languageCodes?.[0],
            gender: v.ssmlGender?.toLowerCase() || 'neutral'
        }));

        res.json({ success: true, data: [...formattedEleven, ...formattedGoogle] });
    } catch (error: any) {
        console.error('List all voices error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/voice/list (Legacy fallback)
router.get('/list', async (req: AuthRequest, res) => {
    try {
        const provider = await getElevenLabs();
        const voices = await provider.listVoices();
        const formatted = voices.map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
            category: v.category,
            preview_url: v.preview_url,
            is_owner: v.category === 'cloned'
        }));
        res.json({ success: true, data: formatted });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/voice/clone
router.post('/clone', upload.array('files', 5), async (req: AuthRequest, res) => {
    try {
        const { name, description } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one audio sample is required' });
        }

        const provider = await getElevenLabs();
        const buffers = files.map(f => f.buffer);

        const voiceId = await provider.cloneVoice(
            name || `Cloned Voice ${Date.now()}`,
            description || 'AntStudio Instant Clone',
            buffers
        );

        res.json({ success: true, data: { voiceId, name } });
    } catch (error: any) {
        console.error('Voice cloning error:', error.message);
        res.status(500).json({ success: false, error: 'Voice cloning failed: ' + error.message });
    }
});

export default router;
