import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

export interface UserMediaItem {
    _id: string;
    key: string;
    url: string; // usually same as key or signed url
    fileName: string;
    contentType: string;
    purpose: string;
    metadata?: any;
    createdAt: string;
}

interface MediaState {
    items: UserMediaItem[];
    loading: boolean;
    error: string | null;
    total: number;
    page: number;
    pages: number;
}

export const useUserMediaStore = defineStore("userMedia", () => {

    const images = ref<MediaState>({ items: [], loading: false, error: null, total: 0, page: 1, pages: 1 });
    const videos = ref<MediaState>({ items: [], loading: false, error: null, total: 0, page: 1, pages: 1 });
    const audios = ref<MediaState>({ items: [], loading: false, error: null, total: 0, page: 1, pages: 1 });

    const fetchMedia = async (type: 'image' | 'video' | 'audio', page = 1, refresh = false) => {
        const state = type === 'image' ? images : type === 'video' ? videos : audios;
        const purpose = type === 'image' ? 'image,ai-image' : type === 'video' ? 'video,ai-video' : 'audio,ai-voice';

        state.value.loading = true;
        state.value.error = null;

        try {
            const res = await api.get(`/media/list?purpose=${purpose}&page=${page}&limit=20`);
            const { media, pagination } = res.data.data;

            // Transform backend media to UserMediaItem if needed (backend returns _id, key, etc directly)
            // We might need to ensure 'url' exists. If backend returns key, we might need to check if it's external or relative.
            // S3 keys are usually relative or absolute URLs depending on implementation. 
            // The `media.ts` upload returns `url: uploadResult.key`.
            // Let's assume `key` is usable as src or needs prefixing.

            const mappedMedia = media.map((m: any) => ({
                ...m,
                // If key starts with http, use it. If not, it might need base URL (handled by getFileUrl in components)
                // We'll leave it as is, components use `getFileUrl`.
                url: m.key
            }));

            if (refresh || page === 1) {
                state.value.items = mappedMedia;
            } else {
                state.value.items.push(...mappedMedia);
            }

            state.value.total = pagination.total;
            state.value.page = pagination.page;
            state.value.pages = pagination.totalPages;

        } catch (err: any) {
            console.error(`Failed to load user ${type}s:`, err);
            state.value.error = err.message || "Failed to load media";
            toast.error(`Failed to load your ${type}s`);
        } finally {
            state.value.loading = false;
        }
    };

    const loadImages = (page = 1) => fetchMedia('image', page);
    const loadVideos = (page = 1) => fetchMedia('video', page);
    const loadAudios = (page = 1) => fetchMedia('audio', page);

    const refreshImages = () => fetchMedia('image', 1, true);
    const refreshVideos = () => fetchMedia('video', 1, true);
    const refreshAudios = () => fetchMedia('audio', 1, true);

    // Helper to add a newly generated/uploaded item to the top of the list locally
    const addLocalItem = (type: 'image' | 'video' | 'audio', item: UserMediaItem) => {
        const state = type === 'image' ? images : type === 'video' ? videos : audios;
        state.value.items.unshift(item);
        state.value.total++;
    };

    return {
        images,
        videos,
        audios,
        loadImages,
        loadVideos,
        loadAudios,
        refreshImages,
        refreshVideos,
        refreshAudios,
        addLocalItem
    };
});
