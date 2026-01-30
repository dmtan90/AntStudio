import { defineStore } from 'pinia';
import axios from 'axios';
import { toast } from 'vue-sonner';

export const usePlatformStore = defineStore('platform', {
    state: () => ({
        accounts: [] as any[],
        loading: false,
        connecting: false,

        // Context for CMS
        videos: [] as any[],
        totalVideos: 0,
        stats: null as any,
        comments: [] as any[],
        videoLoading: false,
        commentsLoading: false
    }),

    actions: {
        async fetchAccounts() {
            this.loading = true;
            try {
                const res = await axios.get('/api/platforms');
                if (res.data.success) {
                    this.accounts = res.data.data;
                }
            } catch (error: any) {
                console.error('Fetch Accounts Error:', error);
                toast.error('Failed to load platform accounts');
            } finally {
                this.loading = false;
            }
        },

        async getAuthUrl(platform: string) {
            try {
                const res = await axios.get(`/api/platforms/auth/${platform}`);
                return res.data;
            } catch (error: any) {
                console.error('Get Auth URL Error:', error);
                throw error;
            }
        },

        async connectPlatform(payload: any) {
            this.connecting = true;
            try {
                const res = await axios.post('/api/platforms', payload);
                if (res.data.success) {
                    this.accounts.unshift(res.data.data); // Add new account to top
                    toast.success('Platform connected successfully');
                    return res.data.data;
                }
            } catch (error: any) {
                console.error('Connect Platform Error:', error);
                const msg = error.response?.data?.error || 'Failed to connect platform';
                toast.error(msg);
                throw error;
            } finally {
                this.connecting = false;
            }
        },

        async updatePlatform(id: string, payload: any) {
            this.connecting = true;
            try {
                const res = await axios.patch(`/api/platforms/${id}`, payload);
                if (res.data.success) {
                    // Update account in local state
                    const index = this.accounts.findIndex(a => a._id === id);
                    if (index !== -1) {
                        this.accounts[index] = res.data.data;
                    }
                    toast.success('Platform updated successfully');
                    return res.data.data;
                }
            } catch (error: any) {
                console.error('Update Platform Error:', error);
                const msg = error.response?.data?.error || 'Failed to update platform';
                toast.error(msg);
                throw error;
            } finally {
                this.connecting = false;
            }
        },

        async disconnectPlatform(id: string) {
            try {
                const res = await axios.delete(`/api/platforms/${id}`);
                if (res.data.success) {
                    this.accounts = this.accounts.filter(a => a._id !== id);
                    toast.success('Platform disconnected');
                }
            } catch (error: any) {
                console.error('Disconnect Platform Error:', error);
                toast.error('Failed to disconnect platform');
            }
        },

        // CMS Actions
        async fetchVideos(accountId: string, params: any = {}) {
            this.videoLoading = true;
            try {
                const res = await axios.get(`/api/platforms/${accountId}/videos`, { params });
                if (res.data.success) {
                    this.videos = res.data.data.videos;
                    this.totalVideos = res.data.data.total;
                }
            } catch (error: any) {
                console.error('Fetch Videos Error:', error);
                toast.error('Failed to load videos');
            } finally {
                this.videoLoading = false;
            }
        },

        async fetchStats(accountId: string) {
            try {
                const res = await axios.get(`/api/platforms/${accountId}/stats`);
                if (res.data.success) {
                    this.stats = res.data.data;
                }
            } catch (error: any) {
                console.error('Fetch Stats Error:', error);
            }
        },

        async fetchComments(accountId: string, videoId: string) {
            this.commentsLoading = true;
            try {
                const res = await axios.get(`/api/platforms/${accountId}/videos/${videoId}/comments`);
                if (res.data.success) {
                    this.comments = res.data.data;
                }
            } catch (error: any) {
                console.error('Fetch Comments Error:', error);
            } finally {
                this.commentsLoading = false;
            }
        },

        async deleteVideo(accountId: string, videoId: string) {
            try {
                const res = await axios.delete(`/api/platforms/${accountId}/videos/${videoId}`);
                if (res.data.success) {
                    this.videos = this.videos.filter(v => v.id !== videoId);
                    this.totalVideos--;
                    toast.success('Video deleted');
                    return true;
                }
            } catch (error: any) {
                console.error('Delete Video Error:', error);
                toast.error(error.response?.data?.error || 'Failed to delete video');
                return false;
            }
        },

        async uploadVideo(accountId: string, payload: any, isMultipart = false) {
            try {
                let res;
                if (isMultipart) {
                    res = await axios.post(`/api/platforms/${accountId}/videos/upload`, payload, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } else {
                    res = await axios.post(`/api/platforms/${accountId}/videos/upload`, payload);
                }

                if (res.data.success) {
                    toast.success('Video uploaded successfully');
                    // Refresh list logic usually handled by caller or just fetching again
                    return true;
                }
            } catch (error: any) {
                console.error('Upload Video Error:', error);
                toast.error(error.response?.data?.error || 'Upload failed');
                throw error;
            }
        },

        async fetchLiveInfo(accountId: string, params: any = {}) {
            try {
                const res = await axios.get(`/api/platforms/${accountId}/live-info`, { params });
                if (res.data.success) {
                    const index = this.accounts.findIndex(a => a._id === accountId);
                    if (index !== -1) {
                        this.accounts[index].rtmpUrl = res.data.data.rtmpUrl;
                        this.accounts[index].streamKey = res.data.data.streamKey;
                    }
                    return res.data.data;
                }
            } catch (error: any) {
                console.error('Fetch Live Info Error:', error);
                toast.error('Failed to get live stream details');
            }
        }
    }
});
