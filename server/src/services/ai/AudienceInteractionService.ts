import { EventEmitter } from 'events';
import { socketServer } from '../SocketServer.js';
import { showRunnerService } from './ShowRunnerService.js';

export interface HivePoll {
    id: string;
    question: string;
    options: string[];
    votes: Record<string, number>; // optionIndex -> count
    totalVotes: number;
    durationSeconds: number;
    createdAt: number;
    expiresAt: number;
    status: 'active' | 'completed';
    winner?: string;
    linkedScriptAction?: string; // If this poll result triggers a script branch
}

export interface DirectorRequest {
    id: string;
    userId: string;
    userName: string;
    type: 'sfx' | 'camera_angle' | 'b_roll';
    payload: any;
    status: 'pending' | 'approved' | 'rejected';
    cost: number; // Credit cost
    timestamp: number;
}

class AudienceInteractionService extends EventEmitter {
    private activePoll: HivePoll | null = null;
    private pollTimer: NodeJS.Timeout | null = null;
    private requestQueue: DirectorRequest[] = [];
    
    // Sentiment State
    private recentMessages: string[] = [];
    private currentSentimentScore: number = 50; // 0 (Negative) - 100 (Positive)

    constructor() {
        super();
        this.startSentimentAnalysisLoop();
    }

    /**
     * Create a new Hive Poll
     */
    public createPoll(question: string, options: string[], durationSeconds: number = 30, linkedAction?: string): HivePoll {
        if (this.activePoll) {
             throw new Error("A poll is already active");
        }

        const poll: HivePoll = {
            id: `poll_${Date.now()}`,
            question,
            options,
            votes: {},
            totalVotes: 0,
            durationSeconds,
            createdAt: Date.now(),
            expiresAt: Date.now() + (durationSeconds * 1000),
            status: 'active',
            linkedScriptAction: linkedAction
        };

        // Initialize votes
        options.forEach((_, idx) => poll.votes[idx.toString()] = 0);

        this.activePoll = poll;
        this.broadcastPollState();

        this.pollTimer = setTimeout(() => {
            this.endPoll();
        }, durationSeconds * 1000);

        return poll;
    }

    /**
     * Cast a vote in the active poll
     */
    public castVote(userId: string, optionIndex: number) {
        if (!this.activePoll || this.activePoll.status !== 'active') return;
        
        const idxStr = optionIndex.toString();
        if (this.activePoll.votes[idxStr] !== undefined) {
            this.activePoll.votes[idxStr]++;
            this.activePoll.totalVotes++;
            // Throttle updates or send immediately? Sending immediately for "Hive" feel
            this.broadcastPollState();
        }
    }

    /**
     * End the current poll and determine winner
     */
    public endPoll() {
        if (!this.activePoll) return;

        let winnerIndex = -1;
        let maxVotes = -1;

        Object.entries(this.activePoll.votes).forEach(([idx, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                winnerIndex = parseInt(idx);
            }
        });

        this.activePoll.status = 'completed';
        this.activePoll.winner = this.activePoll.options[winnerIndex] || 'No votes';

        if (socketServer.getIO()) {
            socketServer.getIO()!.emit('hive:poll_result', this.activePoll);
        }

        // If linked to script, notify ShowRunner
        if (this.activePoll.linkedScriptAction && this.activePoll.winner) {
             showRunnerService.handlePollResult(this.activePoll.linkedScriptAction, this.activePoll.winner);
        }

        this.activePoll = null;
        if (this.pollTimer) clearTimeout(this.pollTimer);
    }

    /**
     * Submit a Director Request (Pay-to-Control)
     */
    public submitDirectorRequest(userId: string, userName: string, type: DirectorRequest['type'], payload: any, cost: number) {
        // Here we would deduct credits via PaymentService
        // await paymentService.deductCredits(userId, cost);

        const req: DirectorRequest = {
            id: `req_${Date.now()}`,
            userId,
            userName,
            type,
            payload,
            status: 'approved', // Auto-approve for now
            cost,
            timestamp: Date.now()
        };

        this.requestQueue.push(req);
        this.executeREQUEST(req);
        
        return req;
    }

    private executeREQUEST(req: DirectorRequest) {
        if (socketServer.getIO()) {
            // Emitting dedicated event, but also notifying ShowRunner
            socketServer.getIO()!.emit('hive:director_action', req);
        }
        
        // Notify ShowRunner to potentially adapt script or log event
        showRunnerService.injectEvent(req.type, req.payload);

        // If it affects studio vibe, update sentiment momentarily
        if (req.type === 'b_roll') {
            // Trigger b-roll
        }
    }

    /**
     * Add chat message for sentiment analysis
     */
    public ingestChatMessage(text: string) {
        this.recentMessages.push(text);
        if (this.recentMessages.length > 50) this.recentMessages.shift();
    }

    /**
     * Simple sentiment analysis loop
     */
    private startSentimentAnalysisLoop() {
        setInterval(() => {
            if (this.recentMessages.length === 0) return;

            // Mock sentiment logic (Replace with real NLP later)
            const positiveKeywords = ['cool', 'awesome', 'love', 'wow', 'great', 'yes', 'agreed', 'hype', '🔥', '❤️'];
            const negativeKeywords = ['boring', 'bad', 'no', 'stop', 'lame', 'hate', 'trash', 'boo', '👎'];

            let score = 50;
            this.recentMessages.forEach(msg => {
                const lower = msg.toLowerCase();
                if (positiveKeywords.some(w => lower.includes(w))) score += 2;
                if (negativeKeywords.some(w => lower.includes(w))) score -= 2;
            });

            // Clamp 0-100
            score = Math.max(0, Math.min(100, score));
            
            // Drift back to neutral
            if (this.recentMessages.length < 5) {
                if (score > 50) score--;
                if (score < 50) score++;
            }

            if (score !== this.currentSentimentScore) {
                this.currentSentimentScore = score;
                if (socketServer.getIO()) {
                    socketServer.getIO()!.emit('hive:sentiment', { score });
                }
            }
            
            // Clear processed messages occasionally?
            // this.recentMessages = []; 
        }, 3000);
    }

    private broadcastPollState() {
        if (!this.activePoll) return;
        if (socketServer.getIO()) {
            socketServer.getIO()!.emit('hive:poll_update', this.activePoll);
        }
    }
}

export const audienceInteractionService = new AudienceInteractionService();
