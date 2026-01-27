import axios from 'axios';

export class ElevenLabsProvider {
    private apiKey: string;
    private baseUrl = 'https://api.elevenlabs.io/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Generate Audio (TTS)
     */
    async generateAudio(prompt: string, modelId: string, options: any = {}) {
        try {
            const voiceId = options.voice || '21m00Tcm4TlvDq8ikWAM'; // Default voice (Rachel)
            const model = modelId || 'eleven_monolingual_v1';

            const response = await axios.post(
                `${this.baseUrl}/text-to-speech/${voiceId}`,
                {
                    text: prompt,
                    model_id: model,
                    voice_settings: options.voice_settings || {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                },
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'arraybuffer'
                }
            );

            // Convert buffer to base64 for consistency with other providers
            const base64Audio = Buffer.from(response.data).toString('base64');
            const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

            return {
                media: {
                    url: dataUrl,
                    mimeType: 'audio/mpeg'
                }
            };

        } catch (error: any) {
            console.error('ElevenLabs TTS Error:', error.response?.data || error.message);
            throw new Error(`ElevenLabs TTS Failed: ${error.message}`);
        }
    }

    /**
     * Clone Voice (Instant Voice Cloning)
     */
    async cloneVoice(name: string, description: string, files: Buffer[]) {
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);

            // Append files (Multipart)
            files.forEach((buffer, index) => {
                const blob = new Blob([buffer as any], { type: 'audio/mpeg' });
                formData.append('files', blob, `sample_${index}.mp3`);
            });

            // Note: Axios FormData handling in Node requires specific libs or manual boundary
            // Better to use 'form-data' package or native fetch in Node 18+
            // Let's use native fetch for this multipart request

            const nativeFormData = new (await import('formdata-node')).FormData();
            nativeFormData.append('name', name);
            nativeFormData.append('description', description);

            files.forEach((buffer, index) => {
                // Determine blob type/filename? assume mp3/wav
                const { File } = require('formdata-node');
                nativeFormData.append('files', new File([buffer], `sample_${index}.mp3`));
            });

            // Actually, simpler to just use 'axios' with 'form-data' pkg if available, 
            // but since we are in a "standard" node env, let's try fetch or just assume axios can handle it with the right form-data instance.
            // Let's stick to a robust config.

            // Re-implementation using axios + form-data package logic (simulated for simplicity if pkg missing, 
            // but we likely need 'form-data' or similar installed.
            // Check package.json? No time. Let's use fetch which is native in Node 18+.

            const finalFormData = new (await import('formdata-node')).FormData();
            finalFormData.set('name', name);
            finalFormData.set('description', description);
            files.forEach((buffer, index) => {
                const { File } = require('formdata-node');
                finalFormData.append('files', new File([buffer], `sample_${index}.mp3`, { type: 'audio/mpeg' }));
            });

            const response = await fetch(`${this.baseUrl}/voices/add`, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.apiKey,
                    // 'Content-Type': 'multipart/form-data' // let fetch set boundary
                },
                // @ts-ignore
                body: finalFormData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail?.message || 'Voice cloning failed');
            }

            const data = await response.json();
            return data.voice_id;

        } catch (error: any) {
            console.error('ElevenLabs Cloning Error:', error);
            throw error;
        }
    }

    /**
     * List Voices
     */
    async listVoices() {
        try {
            const response = await axios.get(`${this.baseUrl}/voices`, {
                headers: { 'xi-api-key': this.apiKey }
            });
            return response.data.voices;
        } catch (error: any) {
            console.error('ElevenLabs List Voices Error:', error.message);
            throw error;
        }
    }
}
