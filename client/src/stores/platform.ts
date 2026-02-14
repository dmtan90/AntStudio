import { defineStore } from 'pinia';
import axios from 'axios';
import api from '@/utils/api';
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
        commentsLoading: false,

        // Syndication Hub
        syndicationRecords: [] as any[],
        syndicationTotal: 0,
        syndicationLoading: false
    }),
    getters: {
        syndicationStats(state) {
            const records = state.syndicationRecords;
            const now = new Date();
            const last14Days = Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(now.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const platformDistribution = {
                youtube: 0,
                tiktok: 0,
                facebook: 0,
                other: 0
            };

            const timeline = last14Days.map(date => ({
                date,
                views: 0,
                likes: 0
            }));

            // Trend calculation: Current 7 days vs Previous 7 days
            const currentWeekStart = new Date();
            currentWeekStart.setDate(now.getDate() - 7);
            const prevWeekStart = new Date();
            prevWeekStart.setDate(now.getDate() - 14);

            let currentViews = 0;
            let prevViews = 0;
            let currentLikes = 0;
            let prevLikes = 0;

            records.forEach(r => {
                const p = r.platform?.toLowerCase() as keyof typeof platformDistribution;
                if (platformDistribution[p] !== undefined) {
                    platformDistribution[p]++;
                } else {
                    platformDistribution.other++;
                }

                const pubDateStr = new Date(r.publishedAt || r.createdAt).toISOString().split('T')[0];
                const pubDate = new Date(r.publishedAt || r.createdAt);
                
                const dayIndex = last14Days.indexOf(pubDateStr);
                if (dayIndex !== -1) {
                    timeline[dayIndex].views += (r.engagement?.views || 0);
                    timeline[dayIndex].likes += (r.engagement?.likes || 0);
                }

                // Trends
                if (pubDate >= currentWeekStart) {
                    currentViews += (r.engagement?.views || 0);
                    currentLikes += (r.engagement?.likes || 0);
                } else if (pubDate >= prevWeekStart) {
                    prevViews += (r.engagement?.views || 0);
                    prevLikes += (r.engagement?.likes || 0);
                }
            });

            const calculateTrend = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? '+100%' : '0%';
                const diff = ((curr - prev) / prev) * 100;
                return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
            };

            return {
                platformDistribution,
                timeline,
                totalViews: records.reduce((acc, r) => acc + (r.engagement?.views || 0), 0),
                totalLikes: records.reduce((acc, r) => acc + (r.engagement?.likes || 0), 0),
                totalShares: records.reduce((acc, r) => acc + (r.engagement?.shares || 0), 0),
                trends: {
                    views: calculateTrend(currentViews, prevViews),
                    likes: calculateTrend(currentLikes, prevLikes)
                }
            };
        }
    },
    actions: {
        async fetchAccounts() {
            this.loading = true;
            try {
                const { data } = await api.get('/platforms');
                console.log(data);
                if (data) {
                    this.accounts = data;
                }
            } catch (error: any) {
                console.error('Fetch Accounts Error:', error);
                toast.error('Failed to load platform accounts');
            } finally {
                this.loading = false;
            }
        },
        async generateHooks(projectId: string, context: string) {
            try {
                const { data } = await api.post('/syndication/generate-hooks', { projectId, context });
                return data;
            } catch (error) {
                console.error('Failed to generate hooks:', error);
                return [];
            }
        },
        async fetchHookStats(projectId: string) {
            try {
                const { data } = await api.get(`/syndication/projects/${projectId}/hook-stats`);
                return data;
            } catch (error) {
                console.error('Failed to fetch hook stats:', error);
                return [];
            }
        },
        async getAuthUrl(platform: string) {
            try {
                const { data } = await api.get(`/platforms/auth/${platform}`);
                return data;
            } catch (error: any) {
                console.error('Get Auth URL Error:', error);
                throw error;
            }
        },

        async handleCallback(platform: string, code: string) {
            try {
                const { data } = await api.post(`/platforms/callback/${platform}`, { code });
                toast.success(`Successfully connected to ${platform}`);
                // Refresh accounts
                await this.fetchAccounts();
                return data;
            } catch (error: any) {
                console.error('Callback Error:', error);
                toast.error('Failed to complete authentication');
                throw error;
            }
        },

        async connectPlatform(payload: any) {
            this.connecting = true;
            try {
                const { data } = await api.post('/platforms', payload);
                if (data) {
                    this.accounts.unshift(data); // Add new account to top
                    toast.success('Platform connected successfully');
                    return data;
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
                const { data } = await api.patch(`/platforms/${id}`, payload);
                if (data) {
                    // Update account in local state
                    const index = this.accounts.findIndex(a => a._id === id);
                    if (index !== -1) {
                        this.accounts[index] = data;
                    }
                    toast.success('Platform updated successfully');
                    return data;
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
                const res: any = await api.delete(`/platforms/${id}`);
                if (res.success) {
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
                const res: any = await api.get(`/platforms/${accountId}/videos`, { params });
                if (res.success) {
                    this.videos = res.data.videos;
                    this.totalVideos = res.total;
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
                const res: any = await api.get(`/platforms/${accountId}/stats`);
                if (res.success) {
                    this.stats = res.data;
                }
            } catch (error: any) {
                console.error('Fetch Stats Error:', error);
            }
        },

        async fetchComments(accountId: string, videoId: string) {
            this.commentsLoading = true;
            try {
                const res: any = await api.get(`/platforms/${accountId}/videos/${videoId}/comments`);
                if (res.success) {
                    this.comments = res.data;
                }
            } catch (error: any) {
                console.error('Fetch Comments Error:', error);
            } finally {
                this.commentsLoading = false;
            }
        },

        async deleteVideo(accountId: string, videoId: string) {
            try {
                const res: any = await api.delete(`/platforms/${accountId}/videos/${videoId}`);
                if (res.success) {
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
                let res: any;
                if (isMultipart) {
                    res = await api.post(`/platforms/${accountId}/videos/upload`, payload, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } else {
                    res = await api.post(`/platforms/${accountId}/videos/upload`, payload);
                }

                if (res.success) {
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
                const res: any = await api.get(`/platforms/${accountId}/live-info`, { params });
                if (res.success) {
                    const index = this.accounts.findIndex(a => a._id === accountId);
                    if (index !== -1) {
                        this.accounts[index].rtmpUrl = res.data.rtmpUrl;
                        this.accounts[index].streamKey = res.data.streamKey;
                    }
                    return res.data;
                }
            } catch (error: any) {
                console.error('Fetch Live Info Error:', error);
                toast.error('Failed to get live stream details');
            }
        },

        async updateLiveTitle(accountId: string, title: string) {
            try {
                const res: any = await api.patch(`/platforms/${accountId}/live-info`, { title });
                if (res.success) {
                    return res.data;
                }
            } catch (error: any) {
                console.error('Update Live Title Error:', error);
                throw error;
            }
        },

        async fetchSyndicationRecords(params: any = {}) {
            this.syndicationLoading = true;
            try {
                const res: any = await api.get('/syndication', { params });
                if (res.success) {
                    this.syndicationRecords = res.data.records;
                    this.syndicationTotal = res.data.pagination.total;
                }
            } catch (error: any) {
                console.error('Fetch Syndication Records Error:', error);
                toast.error('Failed to load syndication history');
            } finally {
                this.syndicationLoading = false;
            }
        },

        async syncSyndicationMetrics() {
            this.syndicationLoading = true;
            try {
                const res: any = await api.post('/syndication/sync');
                if (res.success) {
                    toast.success('Engagement sync started');
                    // We might need to fetch records again after a short delay or just let the user refresh
                    await this.fetchSyndicationRecords();
                }
            } catch (error: any) {
                console.error('Sync Metrics Error:', error);
                toast.error('Failed to sync engagement metrics');
            } finally {
                this.syndicationLoading = false;
            }
        },

        async retrySyndication(recordId: string) {
            this.syndicationLoading = true;
            try {
                const res: any = await api.post(`/syndication/retry/${recordId}`);
                if (res.success) {
                    toast.success('Retry started successfully');
                    await this.fetchSyndicationRecords();
                }
            } catch (error: any) {
                console.error('Retry Syndication Error:', error);
                toast.error(error.response?.data?.error || 'Failed to retry syndication');
            } finally {
                this.syndicationLoading = false;
            }
        },

        async fetchSyndicationComments(recordId: string) {
            try {
                const res: any = await api.get(`/syndication/${recordId}/comments`);
                if (res.success) {
                    return res.data;
                }
            } catch (error: any) {
                console.error('Fetch Comments Error:', error);
                toast.error('Failed to load comments');
            }
        },

        async getAiReplySuggestion(commentText: string, context?: string) {
            try {
                const res: any = await api.post('/syndication/ai-suggestion', { commentText, context });
                if (res.success) {
                    return res.data;
                }
            } catch (error: any) {
                console.error('AI Suggestion Error:', error);
                return null;
            }
        },

        async replyToSyndicationComment(recordId: string, text: string, parentId?: string) {
            try {
                const res: any = await api.post(`/syndication/${recordId}/reply`, { text, parentId });
                if (res.success) {
                    toast.success('Reply posted successfully');
                    return true;
                }
            } catch (error: any) {
                console.error('Reply Error:', error);
                toast.error(error.response?.data?.error || 'Failed to post reply');
                return false;
            }
        },

        async scheduleSyndication(payload: any) {
            this.syndicationLoading = true;
            try {
                const res: any = await api.post('/syndication/schedule', payload);
                if (res.success) {
                    toast.success('Video scheduled successfully');
                    await this.fetchSyndicationRecords();
                    return true;
                }
            } catch (error: any) {
                console.error('Schedule Error:', error);
                toast.error(error.response?.data?.error || 'Failed to schedule video');
                return false;
            } finally {
                this.syndicationLoading = false;
            }
        },

        async publishSyndication(payload: any) {
            this.syndicationLoading = true;
            try {
                const res: any = await api.post('/syndication/publish-video', payload);
                if (res.success) {
                    toast.success('Syndication started successfully');
                    await this.fetchSyndicationRecords();
                    return true;
                }
            } catch (error: any) {
                console.error('Publish Error:', error);
                toast.error(error.response?.data?.error || 'Failed to publish video');
                return false;
            } finally {
                this.syndicationLoading = false;
            }
        },

        async getBestPostingTime(platform: string) {
            try {
                const res: any = await api.get('/syndication/best-time', { params: { platform } });
                if (res.success) {
                    return res.data;
                }
            } catch (error: any) {
                console.error('Best Time Error:', error);
                return null;
            }
        },

        async cancelScheduledSyndication(recordId: string) {
            try {
                const res: any = await api.delete(`/syndication/schedule/${recordId}`);
                if (res.success) {
                    toast.success('Schedule cancelled');
                    await this.fetchSyndicationRecords();
                    return true;
                }
            } catch (error: any) {
                console.error('Cancel Schedule Error:', error);
                toast.error('Failed to cancel schedule');
                return false;
            }
        }
    }
});
