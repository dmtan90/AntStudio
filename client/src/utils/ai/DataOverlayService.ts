import axios from 'axios';

/**
 * Service to fetch and provide real-time dynamic data for Studio overlays.
 * Supports polling external JSON/RSS feeds.
 */
export class DataOverlayService {
    private activeFeeds: Map<string, { url: string, interval: number, timer: any, lastData: any }> = new Map();
    private listeners: ((feedId: string, data: any) => void)[] = [];

    /**
     * Connects an external data source to a specific overlay.
     */
    public connectFeed(feedId: string, url: string, intervalMs: number = 5000) {
        if (this.activeFeeds.has(feedId)) this.disconnectFeed(feedId);

        const timer = setInterval(() => this.poll(feedId, url), intervalMs);
        this.activeFeeds.set(feedId, { url, interval: intervalMs, timer, lastData: null });

        // Initial poll
        this.poll(feedId, url);
    }

    public disconnectFeed(feedId: string) {
        const feed = this.activeFeeds.get(feedId);
        if (feed) {
            clearInterval(feed.timer);
            this.activeFeeds.delete(feedId);
        }
    }

    private async poll(feedId: string, url: string) {
        try {
            // Mocking for now to avoid CORS errors in typical dev envs
            // In production, this would call real APIs or a secure backend proxy
            let data: any = null;

            if (url.includes('crypto')) {
                data = { symbol: 'BTC', price: `$${(98000 + Math.random() * 500).toFixed(2)}`, trend: 'up' };
            } else if (url.includes('sports')) {
                data = { teamA: 'AntStudio-Devs', scoreA: 5, teamB: 'Legacy-Bugs', scoreB: 2, clock: '84:22' };
            } else {
                const response = await axios.get(url);
                data = response.data;
            }

            const feed = this.activeFeeds.get(feedId);
            if (feed) {
                feed.lastData = data;
                this.notifyListeners(feedId, data);
            }
        } catch (error) {
            console.warn(`[DataOverlay] Failed to poll feed ${feedId}:`, error);
        }
    }

    public onDataUpdate(callback: (feedId: string, data: any) => void) {
        this.listeners.push(callback);
    }

    private notifyListeners(feedId: string, data: any) {
        this.listeners.forEach(cb => cb(feedId, data));
    }
}

export const dataOverlayService = new DataOverlayService();
