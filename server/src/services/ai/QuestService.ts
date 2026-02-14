import { EventEmitter } from 'events';

export type GameType = 'trivia' | 'debate' | 'performance';
export type GameState = 'lobby' | 'intro' | 'round_active' | 'judging' | 'result' | 'ended';

export interface GameParticipant {
    agentId: string;
    name: string;
    role: 'host' | 'contestant' | 'judge';
    score: number;
    avatarUrl?: string;
}

export interface GameSession {
    id: string;
    type: GameType;
    state: GameState;
    round: number;
    topic: string; // Current question or debate topic
    participants: GameParticipant[];
    timeRemaining: number;
    metadata: any; // Flexible storage for question options, etc.
}

class QuestService extends EventEmitter {
    private sessions: Map<string, GameSession> = new Map();
    private activeSessionId: string | null = null;
    private timer: NodeJS.Timeout | null = null;

    constructor() {
        super();
    }

    public createSession(type: GameType, topic: string = ''): GameSession {
        const id = `quest_${Date.now()}`;
        const session: GameSession = {
            id,
            type,
            state: 'lobby',
            round: 0,
            topic,
            participants: [],
            timeRemaining: 0,
            metadata: {}
        };
        
        this.sessions.set(id, session);
        this.activeSessionId = id;
        this.emit('session_created', session);
        return session;
    }

    public joinSession(sessionId: string, agentId: string, name: string, role: 'host' | 'contestant' | 'judge' = 'contestant') {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const existing = session.participants.find(p => p.agentId === agentId);
        if (existing) {
            existing.role = role;
            return;
        }

        session.participants.push({
            agentId,
            name,
            role,
            score: 0
        });
        
        this.emit('session_updated', session);
    }

    public startGame(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.state = 'intro';
        this.emit('session_updated', session);
        
        // Auto-progress to round 1 after intro?
        // Let the Host agent drive via tools instead.
    }

    public nextRound(sessionId: string, topic?: string, metadata?: any) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.round++;
        session.state = 'round_active';
        if (topic) session.topic = topic;
        if (metadata) session.metadata = metadata;
        
        this.emit('session_updated', session);
    }

    public updateScore(sessionId: string, agentId: string, points: number) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const p = session.participants.find(p => p.agentId === agentId);
        if (p) {
            p.score += points;
            this.emit('limit_break', { agentId, points }); // Trigger visual FX?
        }
        
        this.emit('session_updated', session);
    }

    public endSession(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.state = 'ended';
        this.activeSessionId = null;
        this.emit('session_updated', session);
    }

    public getActiveSession(): GameSession | null {
        if (!this.activeSessionId) return null;
        return this.sessions.get(this.activeSessionId) || null;
    }
}

export const questService = new QuestService();
