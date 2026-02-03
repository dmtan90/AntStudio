import { GoogleTTSProvider } from '../../utils/ai/providers/GoogleTTSProvider.js';
import { aiAccountManager } from '../../utils/ai/AIAccountManager.js';

export class TTSService {
    private provider: GoogleTTSProvider;

    constructor() {
        this.provider = new GoogleTTSProvider();
    }

    /**
     * Generate speech from text using optimal AI account.
     */
    async synthesizeSpeech(text: string, voiceId?: string): Promise<{ url: string }> {
        const account = await aiAccountManager.getOptimalAccount('text'); // TTS usually uses text/general quota
        if (account) {
            const token = await aiAccountManager.refreshAccessToken(account);
            this.provider.updateClient({ accessToken: token });
        }

        const result = await this.provider.generateAudio(text, voiceId);

        return {
            url: result.media.url // This is a data:audio/mpeg;base64,... URL
        };
    }
}

export const ttsService = new TTSService();
