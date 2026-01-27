import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { aiManager } from '../utils/ai/AIServiceManager.js';
import { ElevenLabsProvider } from '../utils/ai/providers/ElevenLabsProvider.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// Helper to get provider
const getElevenLabs = async () => {
    const provider = await aiManager.getProvider('elevenlabs');
    if (!provider) {
        throw new Error('ElevenLabs provider not configured. Please add API Key.');
    }
    return provider as ElevenLabsProvider;
};

// GET /api/voice/list
router.get('/list', async (req: AuthRequest, res) => {
    try {
        const provider = await getElevenLabs();
        const voices = await provider.listVoices();

        // Filter or format if needed
        const formatted = voices.map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
            category: v.category,
            preview_url: v.preview_url,
            is_owner: v.category === 'cloned' // Simplified assumption
        }));

        res.json({ success: true, data: formatted });
    } catch (error: any) {
        console.error('List voices error:', error.message);
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

        // Convert Multer files to Buffers
        const buffers = files.map(f => f.buffer);

        const voiceId = await provider.cloneVoice(
            name || `Cloned Voice ${Date.now()}`,
            description || 'AntFlow Instant Clone',
            buffers
        );

        res.json({ success: true, data: { voiceId, name } });
    } catch (error: any) {
        console.error('Voice cloning error:', error.message);
        res.status(500).json({ success: false, error: 'Voice cloning failed: ' + error.message });
    }
});

export default router;
