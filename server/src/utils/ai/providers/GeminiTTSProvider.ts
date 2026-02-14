import { GoogleGenAI, Modality } from '@google/genai';
import { geminiPool } from '../../gemini.js';

/**
 * Gemini TTS Provider using Gemini 2.0 Flash Multimodal API
 * Supports direct audio generation via AI Studio API Key
 */
export class GeminiTTSProvider {
    constructor(config?: { apiKey?: string }) {
        // We now use GeminiPool for dynamic selection
    }

    /**
     * List available voices (Gemini 2.0 Flash supports 30 distinct voices)
     * Language is auto-detected from input text
     * Reference: https://ai.google.dev/gemini-api/docs/speech-generation
     */
    async listVoices() {
        // Official Gemini 2.0 Flash TTS Voice Catalog (30 voices)
        // These voices auto-detect language - no need for language-specific variants
        return [
            { id: 'Zephyr', name: 'Zephyr', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Bright, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Zephyr.wav" },
            { id: 'Puck', name: 'Puck', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Upbeat, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Puck.wav" },
            { id: 'Charon', name: 'Charon', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Informative, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Charon.wav" },
            { id: 'Kore', name: 'Kore', language: 'auto', gender: 'female', provider: 'gemini', description: 'Firm, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Kore.wav" },
            { id: 'Fenrir', name: 'Fenrir', language: 'auto', gender: 'male', provider: 'gemini', description: 'Excitable, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Fenrir.wav" },
            { id: 'Leda', name: 'Leda', language: 'auto', gender: 'female', provider: 'gemini', description: 'Youthful, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Leda.wav" },
            { id: 'Orus', name: 'Orus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Firm, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Orus.wav" },
            { id: 'Aoede', name: 'Aoede', language: 'auto', gender: 'female', provider: 'gemini', description: 'Breezy, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Aoede.wav" },
            { id: 'Callirrhoe', name: 'Callirrhoe', language: 'auto', gender: 'female', provider: 'gemini', description: 'Easy-going, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Callirrhoe.wav" },
            { id: 'Autonoe', name: 'Autonoe', language: 'auto', gender: 'female', provider: 'gemini', description: 'Bright, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Autonoe.wav" },
            { id: 'Enceladus', name: 'Enceladus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Breathy, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Enceladus.wav" },
            { id: 'Iapetus', name: 'Iapetus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Clear, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Iapetus.wav" },
            { id: 'Umbriel', name: 'Umbriel', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Easy-going, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Umbriel.wav" },
            { id: 'Algieba', name: 'Algieba', language: 'auto', gender: 'female', provider: 'gemini', description: 'Smooth, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Algieba.wav" },
            { id: 'Despina', name: 'Despina', language: 'auto', gender: 'female', provider: 'gemini', description: 'Smooth, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Despina.wav" },
            { id: 'Erinome', name: 'Erinome', language: 'auto', gender: 'female', provider: 'gemini', description: 'Clear, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Erinome.wav" },
            { id: 'Algenib', name: 'Algenib', language: 'auto', gender: 'male', provider: 'gemini', description: 'Gravelly, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Algenib.wav" },
            { id: 'Rasalgethi', name: 'Rasalgethi', language: 'auto', gender: 'male', provider: 'gemini', description: 'Informative, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Rasalgethi.wav" },
            { id: 'Laomedeia', name: 'Laomedeia', language: 'auto', gender: 'female', provider: 'gemini', description: 'Upbeat, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Laomedeia.wav" },
            { id: 'Achernar', name: 'Achernar', language: 'auto', gender: 'male', provider: 'gemini', description: 'Soft, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Achernar.wav" },
            { id: 'Alnilam', name: 'Alnilam', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Firm, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Alnilam.wav" },
            { id: 'Schedar', name: 'Schedar', language: 'auto', gender: 'female', provider: 'gemini', description: 'Even, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Schedar.wav" },
            { id: 'Gacrux', name: 'Gacrux', language: 'auto', gender: 'male', provider: 'gemini', description: 'Mature, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Gacrux.wav" },
            { id: 'Pulcherrima', name: 'Pulcherrima', language: 'auto', gender: 'female', provider: 'gemini', description: 'Forward, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Pulcherrima.wav" },
            { id: 'Achird', name: 'Achird', language: 'auto', gender: 'female', provider: 'gemini', description: 'Friendly, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Achird.wav" },
            { id: 'Zubenelgenubi', name: 'Zubenelgenubi', language: 'auto', gender: 'male', provider: 'gemini', description: 'Casual, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Zubenelgenubi.wav" },
            { id: 'Vindemiatrix', name: 'Vindemiatrix', language: 'auto', gender: 'female', provider: 'gemini', description: 'Gentle, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Vindemiatrix.wav" },
            { id: 'Sadachbia', name: 'Sadachbia', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Lively, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sadachbia.wav" },
            { id: 'Sadaltager', name: 'Sadaltager', language: 'auto', gender: 'male', provider: 'gemini', description: 'Knowledgeable, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sadaltager.wav" },
            { id: 'Sulafat', name: 'Sulafat', language: 'auto', gender: 'male', provider: 'gemini', description: 'Warm, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sulafat.wav" }
        ];
    }

    /**
     * Generate Audio (TTS) using Gemini Multimodal
     * Supports gemini-2.5-flash-preview-tts (default) and gemini-2.5-pro-preview-tts
     */
    async generateAudio(text: string, voiceId?: string, options: any = {}) {
        const modelName = options.model || 'gemini-2.5-flash-preview-tts';
        try {
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);
            
            const result = await (ai as any).models.generateContent({
                model: modelName,
                systemInstruction: "You are a specialized Text-to-Speech model. Your task is to convert the provided text into audio using the specified voice. Do not generate any text response; only output the synthesized audio modality.",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voiceId || 'Puck'
                            }
                        }
                    }
                }
            });
            
            // In @google/genai SDK, the result is the response itself (not a wrapper with .response)
            const response = result;

            if (!response?.candidates?.[0]) {
                throw new Error(`Gemini TTS Error: No candidates returned. Full result: ${JSON.stringify(result)}`);
            }

            // Extract audio data
            const audioPart = response.candidates[0].content?.parts?.find(
                (part: any) => part.inlineData?.mimeType?.startsWith('audio/')
            );

            if (!audioPart?.inlineData?.data) {
                throw new Error('No audio data returned from Gemini');
            }

            const base64Audio = audioPart.inlineData.data;
            const mimeType = audioPart.inlineData.mimeType || 'audio/wav';
            
            let finalDataUrl = `data:${mimeType};base64,${base64Audio}`;

            // GEMINI FIX: If mimeType is PCM (L16), we must add a WAV header because browsers don't play raw L16
            if (mimeType.toLowerCase().includes('l16') || mimeType.toLowerCase().includes('pcm')) {
                try {
                    const audioBuffer = Buffer.from(base64Audio, 'base64');
                    const sampleRate = 24000; // Gemini default
                    const numChannels = 1;
                    
                    const wavBuffer = Buffer.alloc(44 + audioBuffer.length);
                    wavBuffer.write('RIFF', 0);
                    wavBuffer.writeUInt32LE(36 + audioBuffer.length, 4);
                    wavBuffer.write('WAVE', 8);
                    wavBuffer.write('fmt ', 12);
                    wavBuffer.writeUInt32LE(16, 16);
                    wavBuffer.writeUInt16LE(1, 20); // PCM
                    wavBuffer.writeUInt16LE(numChannels, 22);
                    wavBuffer.writeUInt32LE(sampleRate, 24);
                    wavBuffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
                    wavBuffer.writeUInt16LE(numChannels * 2, 32);
                    wavBuffer.writeUInt16LE(16, 34); // Bits per sample
                    wavBuffer.write('data', 36);
                    wavBuffer.writeUInt32LE(audioBuffer.length, 40);
                    audioBuffer.copy(wavBuffer, 44);
                    
                    finalDataUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
                } catch (e) {
                    console.warn('[GeminiTTS] Failed to add WAV header:', e);
                }
            }

            // Record usage
            await geminiPool.recordUsage(key, modelName);

            return {
                media: {
                    url: finalDataUrl,
                    mimeType: 'audio/wav'
                }
            };
        } catch (error: any) {
            console.error('Gemini TTS Generation Error:', error.message);
            throw error;
        }
    }

    /**
     * Update Client (Legacy)
     */
    updateClient(config: { apiKey: string }) {
        // Dynamic pooling handles this automatically
    }
}
