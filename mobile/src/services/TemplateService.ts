import { apiClient } from '../api/client';
import { useEditorStore, Clip, Track } from '../stores/useEditorStore';

export interface Template {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    category: string;
    tags: string[];
    duration: number;
    tracks: Track[]; // Structure of tracks/clips in the template
}

class TemplateService {
    async getTemplates(category?: string, tag?: string): Promise<Template[]> {
        try {
            const params: any = {};
            if (category && category !== 'All') params.category = category;
            if (tag) params.tag = tag;

            const response = await apiClient.get('/templates', { params });
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            // Return mock data for development if backend fails or is empty
            return this.getMockTemplates();
        }
    }

    async getTemplateById(id: string): Promise<Template | null> {
        try {
            const response = await apiClient.get(`/templates/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch template details:', error);
            return this.getMockTemplates().find(t => t.id === id) || null;
        }
    }

    async applyTemplate(templateId: string) {
        const template = await this.getTemplateById(templateId);
        if (!template) throw new Error('Template not found');

        // Apply template tracks to the editor store
        useEditorStore.getState().reset();

        // We need to carefully merge or replace tracks. 
        // For simplicity, we'll replace current tracks with template tracks
        // In a real app, we might want to map placeholder clips to user media

        // Deep copy to avoid reference issues
        const tracksCopy = JSON.parse(JSON.stringify(template.tracks));

        useEditorStore.setState({
            tracks: tracksCopy,
            duration: template.duration,
            currentTime: 0
        });

        return true;
    }

    private getMockTemplates(): Template[] {
        return [
            {
                id: 'tpl_vlog_01',
                name: 'Daily Vlog',
                description: 'Perfect for daily vlogs with upbeat transitions.',
                thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&q=80',
                category: 'Vlog',
                tags: ['vlog', 'daily', 'lifestyle'],
                duration: 30,
                tracks: [
                    {
                        id: 'track-1',
                        type: 'video',
                        muted: false,
                        volume: 1,
                        clips: [
                            {
                                id: 'clip-1',
                                uri: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
                                type: 'video',
                                trackId: 'track-1',
                                startTime: 0,
                                duration: 5,
                                trimStart: 0,
                                trimEnd: 5,
                                effects: []
                            },
                            {
                                id: 'clip-2',
                                uri: 'https://assets.mixkit.co/videos/preview/mixkit-womans-feet-splashing-in-the-pool-1261-large.mp4',
                                type: 'video',
                                trackId: 'track-1',
                                startTime: 5,
                                duration: 5,
                                trimStart: 0,
                                trimEnd: 5,
                                effects: []
                            }
                        ]
                    },
                    {
                        id: 'track-2',
                        type: 'audio',
                        muted: false,
                        volume: 0.8,
                        clips: []
                    }
                ]
            },
            {
                id: 'tpl_travel_01',
                name: 'Travel Cinematic',
                description: 'Cinematic look for your travel footage.',
                thumbnail: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80',
                category: 'Travel',
                tags: ['travel', 'cinematic', 'holiday'],
                duration: 45,
                tracks: [
                    {
                        id: 'track-1',
                        type: 'video',
                        muted: false,
                        volume: 1,
                        clips: []
                    }
                ]
            },
            {
                id: 'tpl_promo_01',
                name: 'Product Promo',
                description: 'Fast-paced promo for product showcases.',
                thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
                category: 'Business',
                tags: ['promo', 'business', 'ad'],
                duration: 15,
                tracks: []
            }
        ];
    }
}

export const templateService = new TemplateService();
