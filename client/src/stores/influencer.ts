import { defineStore } from 'pinia';
import api from '../utils/api';
import { toast } from 'vue-sonner';
const GENERATE_ASSET_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export interface InfluencerState {
    influencers: any[];
    currentInfluencer: any | null;
    voices: any[];
    isLoading: boolean;
    error: string | null;
}

export const useInfluencerStore = defineStore('influencer', {
    state: (): InfluencerState => ({
        influencers: [],
        currentInfluencer: null,
        voices: [],
        isLoading: false,
        error: null
    }),

    actions: {
        /**
         * Fetch all Influencers from the library.
         */
        async fetchInfluencers(page = 1, limit = 12) {
            this.isLoading = true;
            try {
                const response = await api.get(`/influencer/list?page=${page}&limit=${limit}`);
                this.influencers = response.data || [];
                return response.data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to fetch influencer library';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Fetch or initialize a specific Influencer for an entity.
         */
        async fetchInfluencer(entityId: string, name?: string) {
            this.isLoading = true;
            try {
                const { data } = await api.get(`/influencer/${entityId}?name=${name || ''}`);
                this.currentInfluencer = data;
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to load influencer';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Update Influencer state (Holistic sync)
         */
        async updateInfluencer(entityId: string, data: any) {
            try {
                // Prepare payload for new schema
                const payload = { ...data };
                
                const res = await api.post(`/influencer/${entityId}/update`, payload);
                toast.success('Influencer updated successfully');
                
                if (this.currentInfluencer && this.currentInfluencer.entityId === entityId) {
                    await this.fetchInfluencer(entityId);
                }
                return res.data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to update influencer';
                toast.error(this.error);
                throw e;
            }
        },

        /**
         * Delete an Influencer permanently.
         */
        async deleteInfluencer(entityId: string) {
            try {
                await api.delete(`/influencer/${entityId}`);
                this.influencers = this.influencers.filter(v => v.entityId !== entityId);
                if (this.currentInfluencer?.entityId === entityId) {
                    this.currentInfluencer = null;
                }
                toast.success('Influencer deleted successfully');
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to delete influencer';
                toast.error(this.error);
                throw e;
            }
        },

        /**
         * Fetch voices for a specific provider.
         */
        async fetchVoices(provider: string, language?: string) {
            try {
                const { data } = await api.get(`/influencer/voices/${provider}${language ? `?language=${language}` : ''}`);
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
        async generateVoicePreview(config: { text: string, provider: string, voiceId: string, language?: string, speed?: number, pitch?: number }) {
            try {
                const { data } = await api.post('/influencer/voice-preview', config);
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to generate voice preview';
                throw e;
            }
        },

        /**
         * Generate AI speech script for avatar.
         */
        async generateScript(params: { avatarName?: string; topic?: string; language?: string; style?: string }) {
            try {
                const { data } = await api.post('/influencer/ai/generate-script', params);
                return data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to generate script';
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
                const { data } = await api.post(`/influencer/${entityId}/model`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Model uploaded successfully');
                if (this.currentInfluencer) {
                    if (!this.currentInfluencer.visual) this.currentInfluencer.visual = {};
                    this.currentInfluencer.visual.modelUrl = data.modelUrl;
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
                const { data } = await api.post(`/influencer/${entityId}/digital-double`, formData, {
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
                const { data } = await api.post('/influencer/ai/generate-image', config);
                return data;
            } catch (e: any) {
                toast.error('Failed to generate image');
                throw e;
            }
        },

        // Generate Generic Video (Veo3/Kling)
        async generateVideo(payload: {
            prompt: string
            duration?: number
            aspectRatio?: string
            characterImages?: string[]
        }) {
            try {
                const res: any = await api.post('/influencer/generate-video', payload, {
                    timeout: GENERATE_ASSET_TIMEOUT
                });
                return res.data?.data || res.data
            } catch (error: any) {
                toast.error('Failed to start video generation: ' + (error.response?.data?.error || error.message))
                throw error
            }
        },

        async generateProductVideo(influencerId: string, productId: string, language?: string) {
            try {
                const res: any = await api.post(`/influencer/${influencerId}/generate-product-video`, { productId, language }, {
                    timeout: GENERATE_ASSET_TIMEOUT
                });
                return res.data?.data || res.data
            } catch (error: any) {
                toast.error('Failed to start video generation: ' + (error.response?.data?.error || error.message))
                throw error
            }
        },

        async analyzeVision(config: any) {
            try {
                const res: any = await api.post('/influencer/ai/analyze-vision', config);
                return res.data?.data || res.data;
            } catch (e: any) {
                toast.error('Vision analysis failed');
                throw e;
            }
        },

        async translateText(config: any) {
            try {
                const res: any = await api.post('/influencer/ai/translate', config);
                return res.data?.data || res.data;
            } catch (e: any) {
                toast.error('Translation failed');
                throw e;
            }
        },

        async addKnowledge(entityId: string, knowledge: any) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/knowledge`, knowledge);
                toast.success('Knowledge added');
                return res.data?.data || res.data;
            } catch (e: any) {
                toast.error('Failed to add knowledge');
                throw e;
            }
        },

        async addLora(entityId: string, lora: any) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/lora`, lora);
                toast.success('LoRA weight updated');
                return res.data?.data || res.data;
            } catch (e: any) {
                toast.error('Failed to add LoRA');
                throw e;
            }
        },

        async addRelationship(entityId: string, relationship: any) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/relationship`, relationship);
                toast.success('Social bond updated');
                return res.data?.data || res.data;
            } catch (e: any) {
                toast.error('Failed to add relationship');
                throw e;
            }
        },

        async handleUpdateStyle(entityId: string, style: any) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/style`, style);
                toast.success('Style preference updated');
                return res.data?.data || res.data;
            } catch (e: any) {
                toast.error('Failed to update style');
                throw e;
            }
        },

        /**
         * Quick emotion update (no backend call, for live performance)
         */
        setEmotion(entityId: string, emotion: string) {
            const influencer = this.influencers.find(v => v.entityId === entityId);
            if (influencer) {
                influencer.currentEmotion = emotion;
            }
            if (this.currentInfluencer?.entityId === entityId) {
                this.currentInfluencer.currentEmotion = emotion;
            }
        },

        /**
         * Update animation config with optional backend sync
         */
        async updateAnimationConfig(entityId: string, config: any, persist = false) {
            const influencer = this.influencers.find(v => v.entityId === entityId);
            if (influencer) {
                influencer.animationConfig = { ...influencer.animationConfig, ...config };
            }
            if (this.currentInfluencer && this.currentInfluencer.entityId === entityId) {
                this.currentInfluencer.animationConfig = {
                    ...(this.currentInfluencer.animationConfig || {}),
                    ...config
                };
            }
            
            if (persist) {
                try {
                    await api.post(`/influencer/${entityId}/animation`, config);
                    toast.success('Animation settings saved');
                } catch (e: any) {
                    console.warn('[InfluencerStore] Failed to persist animation config:', e);
                    toast.error('Failed to save animation settings');
                }
            }
        },

        /**
         * Update performance config with optional backend sync
         */
        async updatePerformanceConfig(entityId: string, config: any, persist = false) {
            const influencer = this.influencers.find(v => v.entityId === entityId);
            if (influencer) {
                influencer.performanceConfig = { ...influencer.performanceConfig, ...config };
            }
            if (this.currentInfluencer && this.currentInfluencer.entityId === entityId) {
                this.currentInfluencer.performanceConfig = {
                    ...(this.currentInfluencer.performanceConfig || {}),
                    ...config
                };
            }
            
            if (persist) {
                try {
                    await api.post(`/influencer/${entityId}/performance`, config);
                    toast.success('Performance settings saved');
                } catch (e: any) {
                    console.warn('[InfluencerStore] Failed to persist performance config:', e);
                    toast.error('Failed to save performance settings');
                }
            }
        },

        /**
         * Update visual config (e.g., background URL)
         */
        async updateVisualConfig(entityId: string, visualUpdates: any, persist = false) {
            const influencer = this.influencers.find(v => v.entityId === entityId);
            if (influencer) {
                influencer.visual = { ...influencer.visual, ...visualUpdates };
            }
            if (this.currentInfluencer && this.currentInfluencer.entityId === entityId) {
                this.currentInfluencer.visual = {
                    ...(this.currentInfluencer.visual || {}),
                    ...visualUpdates
                };
            }
            console.log('updateVisualConfig', influencer, this.currentInfluencer);
            
            if (persist) {
                try {
                    await api.post(`/influencer/${entityId}/update`, { 
                        visual: influencer?.visual || this.currentInfluencer?.visual 
                    });
                } catch (e: any) {
                    console.warn('[InfluencerStore] Failed to persist visual config:', e);
                }
            }
        },

        async syncAidolClips(entityId: string, clips: Record<string, string>) {
            try {
                const { data }: any = await api.post(`/influencer/${entityId}/sync-clips`, { 
                    aidolClips: clips 
                });
                
                // Update local state
                const influencer = this.influencers.find(v => v.entityId === entityId);
                if (influencer) {
                    if (!influencer.visual) influencer.visual = {};
                    if (!influencer.visual.aidolClips) influencer.visual.aidolClips = {};
                    // Merge local partial update
                    Object.assign(influencer.visual.aidolClips, clips);
                }
                if (this.currentInfluencer && this.currentInfluencer.entityId === entityId) {
                    if (!this.currentInfluencer.visual) this.currentInfluencer.visual = {};
                    if (!this.currentInfluencer.visual.aidolClips) this.currentInfluencer.visual.aidolClips = {};
                    // Merge local partial update
                    Object.assign(this.currentInfluencer.visual.aidolClips, clips);
                }
                
                return data;
            } catch (e: any) {
                console.error('[InfluencerStore] Failed to sync clips:', e);
                throw e;
            }
        },

        // --- Interaction Actions ---

        /**
         * Trigger Influencer reaction to a chat message
         */
        async reactToChat(entityId: string, userName: string, message: string) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/interact/chat`, { userName, message });
                return res.data?.data || res.data; // { text, emotion, gesture }
            } catch (e: any) {
                console.error('Failed to trigger chat reaction:', e);
                throw e; // Let caller handle error feedback
            }
        },

        /**
         * Trigger Influencer reaction to a gift
         */
        async reactToGift(entityId: string, userName: string, giftName: string, amount: number) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/interact/gift`, { userName, giftName, amount });
                toast.success(`Influencer acknowledged gift: ${giftName}`);
                return res.data?.data || res.data;
            } catch (e: any) {
                console.error('Failed to trigger gift reaction:', e);
                throw e;
            }
        },

        /**
         * Trigger Influencer reaction to poll results
         */
        async reactToPoll(entityId: string, question: string, winner: string) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/interact/poll`, { question, winner });
                return res.data?.data || res.data;
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
                const res: any = await api.get(`/influencer/${entityId}/analytics`);
                const data = res.data?.data || res.data;
                // Update local state if needed
                if (this.currentInfluencer && this.currentInfluencer.entityId === entityId) {
                    this.currentInfluencer.analytics = data.analytics;
                    this.currentInfluencer.interactions = data.recentInteractions;
                }
                return data;
            } catch (e: any) {
                console.warn('Failed to fetch analytics:', e);
                return null;
            }
        },

        /**
         * Trigger autonomous video generation for a list of products.
         */
        async prepareSalesVideos(entityId: string, productIds: string[]) {
            try {
                const res: any = await api.post(`/influencer/${entityId}/sales/prepare`, { productIds });
                toast.success('Sales video generation triggered');
                return res.data?.data || res.data;
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to prepare sales videos';
                toast.error(this.error);
                throw e;
            }
        },

        async prepareSaleScripts(influencerIds: string[], productIds: string[], assignmentMap: any, language: string = "en-US"){
            try {
                const res: any = await api.post('/influencer/sales/orchestrate', {
                    productIds: productIds,
                    influencerIds,
                    assignmentMap: assignmentMap,
                    language: language
                });
                console.log("prepareSaleScripts", res);
                // toast.success('Sales script generation successfully');
                return res.data?.data || res.data;
            } catch (e) {
                this.error = e.response?.data?.error || 'Failed to prepare sales videos';
                toast.error(this.error);
                throw e;
            }
        },

        /**
         * Fetch current sales playlist.
         */
        async fetchSalesPlaylist(entityId: string, productIds: string[]) {
            try {
                const res: any = await api.get(`/influencer/${entityId}/sales/playlist?productIds=${productIds.join(',')}`);
                return res.data?.data || res.data;
            } catch (e: any) {
                console.warn('Failed to fetch sales playlist:', e);
                return [];
            }
        },

        /**
         * Toggle co-host in active session.
         */
        async toggleCoHost(entityId: string, coHostId: string, action: 'add' | 'remove') {
            try {
                await api.post(`/influencer/${entityId}/co-host/toggle`, { coHostId, action });
                toast.success(`Co-host ${action === 'add' ? 'invited' : 'removed'}`);
                await this.fetchInfluencer(entityId); // Refresh state
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to toggle co-host';
                toast.error(this.error);
            }
        },

        /**
         * Toggle influencer in collaboration network.
         */
        async toggleCollaborator(entityId: string, collaboratorId: string, action: 'add' | 'remove') {
            try {
                await api.post(`/influencer/${entityId}/collaborator/toggle`, { collaboratorId, action });
                toast.success(`Collaborator ${action === 'add' ? 'added' : 'removed'}`);
                await this.fetchInfluencer(entityId); // Refresh state
            } catch (e: any) {
                this.error = e.response?.data?.error || 'Failed to toggle collaborator';
                toast.error(this.error);
            }
        }
    }
});
