import { EventEmitter } from 'events';
import { socketServer } from '../SocketServer.js';

export interface AnalyticsSnapshot {
    timestamp: number;
    metrics: {
        ccu: number;
        messagesPerMinute: number;
        creditsSpent: number;
        avgSentiment: number; // 0-100
    };
    recentEvents: AnalyticsEvent[];
}

export interface AnalyticsEvent {
    id: string;
    timestamp: number;
    type: 'purchase' | 'levelup' | 'raid' | 'subscription';
    description: string;
    value?: number;
}

class AnalyticsService extends EventEmitter {
    private messageCountBuffer: number = 0;
    private creditSpendBuffer: number = 0;
    private sentimentBuffer: number[] = [];
    private recentEvents: AnalyticsEvent[] = [];
    
    // History for sparkle-lines (store last 60 points)
    private history: AnalyticsSnapshot[] = [];

    constructor() {
        super();
        this.startAggregationLoop();
    }

    public trackMessage() {
        this.messageCountBuffer++;
    }

    public trackSpend(amount: number) {
        this.creditSpendBuffer += amount;
    }

    public trackSentiment(score: number) {
        this.sentimentBuffer.push(score);
    }

    public trackEvent(type: AnalyticsEvent['type'], description: string, value?: number) {
        const event: AnalyticsEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            description,
            value
        };
        
        this.recentEvents.unshift(event);
        if (this.recentEvents.length > 50) this.recentEvents.pop(); // Keep last 50
        
        // Broadcast high-value events immediately
        if (value && value > 100) {
             socketServer.emitToAll('analytics:alert', event);
        }
    }

    private startAggregationLoop() {
        // Run aggregation every 5 seconds
        setInterval(() => {
            this.aggregateAndBroadcast();
        }, 5000);
    }

    private aggregateAndBroadcast() {
        // Calculate averages/totals for the window
        const avgSentiment = this.sentimentBuffer.length > 0
            ? this.sentimentBuffer.reduce((a, b) => a + b, 0) / this.sentimentBuffer.length
            : 50; // Default neutral

        const snapshot: AnalyticsSnapshot = {
            timestamp: Date.now(),
            metrics: {
                ccu: socketServer.getConnectedUsers().length,
                messagesPerMinute: this.messageCountBuffer * 12, // Extrapolate 5s to 60s
                creditsSpent: this.creditSpendBuffer,
                avgSentiment: Math.round(avgSentiment)
            },
            recentEvents: this.recentEvents.slice(0, 5) // Send top 5 recent
        };

        // Store history
        this.history.push(snapshot);
        if (this.history.length > 60) this.history.shift();

        // Broadcast to "admin" or relevant clients
        // For now, broadcasting to all because we don't have strict roles yet
        // In prod, use `socketServer.getIO()?.to('admin').emit(...)`
        socketServer.emitToAll('analytics:update', snapshot);

        // Reset buffers
        this.messageCountBuffer = 0;
        this.creditSpendBuffer = 0;
        this.sentimentBuffer = [];
    }
}

export const analyticsService = new AnalyticsService();
