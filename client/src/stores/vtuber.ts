import { defineStore } from 'pinia';
import api from '../utils/api';
import { toast } from 'vue-sonner';

export interface VTuberState {
    vtubers: any[];
    currentVTuber: any | null;
    voices: any[];
    isLoading: boolean;
    error: string | null;
}

export const useVTuberStore = defineStore('vtuber', {
    state: (): VTuberState => ({
        vtubers: [],
        currentVTuber: null,
        voices: [],
        isLoading: false,
        error: null
    }),

    actions: {
        /**
         * Fetch all VTubers from the library.
         */
        async fetchLibrary(page = 1, limit = 12) {
            this.isLoading = true;
            try {
                const response = await api.get(`/vtuber/list?page=${page}&limit=${limit}`);
                this.vtubers = response.data || [];
                return response.data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to fetch VTuber library';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Fetch or initialize a specific VTuber for an entity.
         */
        async fetchVTuber(entityId: string, name?: string) {
            this.isLoading = true;
            try {
                const { data } = await api.get(`/vtuber/${entityId}?name=${name || ''}`);
                this.currentVTuber = data;
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to load VTuber';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Update VTuber state (Holistic sync)
         */
        async updateVTuber(entityId: string, data: any) {
            try {
                // Prepare payload for new schema
                const payload = { ...data };
                
                const res = await api.post(`/vtuber/${entityId}/update`, payload);
                toast.success('VTuber updated successfully');
                
                if (this.currentVTuber && this.currentVTuber.entityId === entityId) {
                    await this.fetchVTuber(entityId);
                }
                return res.data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to update VTuber';
                toast.error(this.error);
                throw e;
            }
        },

        /**
         * Delete a VTuber permanently.
         */
        async deleteVTuber(entityId: string) {
            try {
                await api.delete(`/vtuber/${entityId}`);
                this.vtubers = this.vtubers.filter(v => v.entityId !== entityId);
                if (this.currentVTuber?.entityId === entityId) {
                    this.currentVTuber = null;
                }
                toast.success('VTuber deleted successfully');
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to delete VTuber';
                toast.error(this.error);
                throw e;
            }
        },

        /**
         * Fetch voices for a specific provider.
         */
        async fetchVoices(provider: string, language?: string) {
            try {
                const { data } = await api.get(`/vtuber/voices/${provider}${language ? `?language=${language}` : ''}`);
                this.voices = data;
                return data;
            } catch (e: any) {
                console.warn('Failed to fetch dynamic voices:', e);
                return [];
            }
        },

        /**
         * Generate a preview for a selected voice.
         */
        async generateVoicePreview(config: { text: string, provider: string, voiceId: string, language?: string }) {
            try {
                const { data } = await api.post('/vtuber/voice-preview', config);
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to generate voice preview';
                throw e;
            }
        },

        /**
         * Specialized update for visual model.
         */
        async uploadModel(entityId: string, file: File) {
            const formData = new FormData();
            formData.append('model', file);
            
            try {
                const { data } = await api.post(`/vtuber/${entityId}/model`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Model uploaded successfully');
                if (this.currentVTuber) {
                    if (!this.currentVTuber.visual) this.currentVTuber.visual = {};
                    this.currentVTuber.visual.modelUrl = data.modelUrl;
                }
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to upload model';
                toast.error(this.error);
                throw e;
            }
        },

        async generateDigitalDouble(entityId: string, photoFile: File) {
            const formData = new FormData();
            formData.append('photo', photoFile);

            try {
                const { data } = await api.post(`/vtuber/${entityId}/digital-double`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 300000
                });
                toast.success('Digital double initialized');
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to generate digital double';
                toast.error(this.error);
                throw e;
            }
        },

        // AI Production Tools
        async generateImage(config: any) {
            try {
                const { data } = await api.post('/vtuber/ai/generate-image', config);
                return data;
            } catch (e: any) {
                toast.error('Failed to generate image');
                throw e;
            }
        },

        async analyzeVision(config: any) {
            try {
                const { data } = await api.post('/vtuber/ai/analyze-vision', config);
                return data;
            } catch (e: any) {
                toast.error('Vision analysis failed');
                throw e;
            }
        },

        async translateText(config: any) {
            try {
                const { data } = await api.post('/vtuber/ai/translate', config);
                return data;
            } catch (e: any) {
                toast.error('Translation failed');
                throw e;
            }
        },

        async addKnowledge(entityId: string, knowledge: any) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/knowledge`, knowledge);
                toast.success('Knowledge added');
                return data;
            } catch (e: any) {
                toast.error('Failed to add knowledge');
                throw e;
            }
        },

        async addLora(entityId: string, lora: any) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/lora`, lora);
                toast.success('LoRA weight updated');
                return data;
            } catch (e: any) {
                toast.error('Failed to add LoRA');
                throw e;
            }
        },

        async addRelationship(entityId: string, relationship: any) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/relationship`, relationship);
                toast.success('Social bond updated');
                return data;
            } catch (e: any) {
                toast.error('Failed to add relationship');
                throw e;
            }
        },

        async handleUpdateStyle(entityId: string, style: any) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/style`, style);
                toast.success('Style preference updated');
                return data;
            } catch (e: any) {
                toast.error('Failed to update style');
                throw e;
            }
        },

        // Helper for legacy components while they migrate
        async fetchBioDoubles(page = 1, limit = 12) {
            return this.fetchLibrary(page, limit);
        },
        async fetchVTuberManifest(id: string) {
            return this.fetchVTuber(id);
        },

        /**
         * Quick emotion update (no backend call, for live performance)
         */
        setEmotion(entityId: string, emotion: string) {
            const vtuber = this.vtubers.find(v => v.entityId === entityId);
            if (vtuber) {
                vtuber.currentEmotion = emotion;
            }
            if (this.currentVTuber?.entityId === entityId) {
                this.currentVTuber.currentEmotion = emotion;
            }
        },

        /**
         * Update animation config with optional backend sync
         */
        async updateAnimationConfig(entityId: string, config: any, persist = false) {
            const vtuber = this.vtubers.find(v => v.entityId === entityId);
            if (vtuber) {
                vtuber.animationConfig = { ...vtuber.animationConfig, ...config };
            }
            if (this.currentVTuber && this.currentVTuber.entityId === entityId) {
                this.currentVTuber.animationConfig = {
                    ...(this.currentVTuber.animationConfig || {}),
                    ...config
                };
            }
            
            if (persist) {
                try {
                    await api.post(`/vtuber/${entityId}/animation`, config);
                    toast.success('Animation settings saved');
                } catch (e: any) {
                    console.warn('[VTuberStore] Failed to persist animation config:', e);
                    toast.error('Failed to save animation settings');
                }
            }
        },

        /**
         * Update performance config with optional backend sync
         */
        async updatePerformanceConfig(entityId: string, config: any, persist = false) {
            const vtuber = this.vtubers.find(v => v.entityId === entityId);
            if (vtuber) {
                vtuber.performanceConfig = { ...vtuber.performanceConfig, ...config };
            }
            if (this.currentVTuber && this.currentVTuber.entityId === entityId) {
                this.currentVTuber.performanceConfig = {
                    ...(this.currentVTuber.performanceConfig || {}),
                    ...config
                };
            }
            
            if (persist) {
                try {
                    await api.post(`/vtuber/${entityId}/performance`, config);
                    toast.success('Performance settings saved');
                } catch (e: any) {
                    console.warn('[VTuberStore] Failed to persist performance config:', e);
                    toast.error('Failed to save performance settings');
                }
            }
        },

        /**
         * Update visual config (e.g., background URL)
         */
        async updateVisualConfig(entityId: string, visualUpdates: any, persist = false) {
            const vtuber = this.vtubers.find(v => v.entityId === entityId);
            if (vtuber) {
                vtuber.visual = { ...vtuber.visual, ...visualUpdates };
            }
            if (this.currentVTuber && this.currentVTuber.entityId === entityId) {
                this.currentVTuber.visual = {
                    ...(this.currentVTuber.visual || {}),
                    ...visualUpdates
                };
            }
            
            if (persist) {
                try {
                    await api.post(`/vtuber/${entityId}/update`, { 
                        visual: vtuber?.visual || this.currentVTuber?.visual 
                    });
                } catch (e: any) {
                    console.warn('[VTuberStore] Failed to persist visual config:', e);
                }
            }
        },

        // --- Phase 1: Interaction Actions ---

        /**
         * Trigger VTuber reaction to a chat message
         */
        async reactToChat(entityId: string, userName: string, message: string) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/interact/chat`, { userName, message });
                return data.data; // { text, emotion, gesture }
            } catch (e: any) {
                console.error('Failed to trigger chat reaction:', e);
                throw e; // Let caller handle error feedback
            }
        },

        /**
         * Trigger VTuber reaction to a gift
         */
        async reactToGift(entityId: string, userName: string, giftName: string, amount: number) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/interact/gift`, { userName, giftName, amount });
                toast.success(`VTuber acknowledged gift: ${giftName}`);
                return data.data;
            } catch (e: any) {
                console.error('Failed to trigger gift reaction:', e);
                throw e;
            }
        },

        /**
         * Trigger VTuber reaction to poll results
         */
        async reactToPoll(entityId: string, question: string, winner: string) {
            try {
                const { data } = await api.post(`/vtuber/${entityId}/interact/poll`, { question, winner });
                return data.data;
            } catch (e: any) {
                console.error('Failed to trigger poll reaction:', e);
                throw e;
            }
        },

        /**
         * Fetch analytics and interaction history
         */
        async fetchAnalytics(entityId: string) {
            try {
                const { data } = await api.get(`/vtuber/${entityId}/analytics`);
                // Update local state if needed
                if (this.currentVTuber && this.currentVTuber.entityId === entityId) {
                    this.currentVTuber.analytics = data.data.analytics;
                    this.currentVTuber.interactions = data.data.recentInteractions;
                }
                return data.data;
            } catch (e: any) {
                console.warn('Failed to fetch analytics:', e);
                return null;
            }
        }
    }
});
