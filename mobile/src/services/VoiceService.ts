import { apiClient } from '../api/client';

interface VoiceCloneConfig {
    name: string;
    description?: string;
    audioSamples: string[]; // Base64 encoded audio
}

interface TTSConfig {
    text: string;
    voiceId: string;
    stability?: number;
    similarityBoost?: number;
}

class VoiceService {
    // Get available voices
    async getVoices(): Promise<any[]> {
        try {
            const response = await apiClient.get('/voice/list');
            return response.data.voices || [];
        } catch (error) {
            console.error('Failed to get voices:', error);
            return [];
        }
    }

    // Clone a voice
    async cloneVoice(config: VoiceCloneConfig): Promise<{ voiceId: string; name: string }> {
        try {
            const response = await apiClient.post('/voice/clone', {
                name: config.name,
                description: config.description,
                samples: config.audioSamples,
            });

            return {
                voiceId: response.data.voiceId,
                name: response.data.name,
            };
        } catch (error) {
            console.error('Voice cloning failed:', error);
            throw new Error('Failed to clone voice');
        }
    }

    // Generate speech from text
    async generateSpeech(config: TTSConfig): Promise<string> {
        try {
            const response = await apiClient.post('/voice/tts', {
                text: config.text,
                voiceId: config.voiceId,
                stability: config.stability || 0.5,
                similarityBoost: config.similarityBoost || 0.75,
            });

            // Returns base64 encoded audio
            return response.data.audioData;
        } catch (error) {
            console.error('TTS generation failed:', error);
            throw new Error('Failed to generate speech');
        }
    }

    // Delete a voice
    async deleteVoice(voiceId: string): Promise<boolean> {
        try {
            await apiClient.delete(`/voice/${voiceId}`);
            return true;
        } catch (error) {
            console.error('Failed to delete voice:', error);
            return false;
        }
    }

    // Get voice details
    async getVoiceDetails(voiceId: string): Promise<any> {
        try {
            const response = await apiClient.get(`/voice/${voiceId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to get voice details:', error);
            return null;
        }
    }
}

export const voiceService = new VoiceService();
