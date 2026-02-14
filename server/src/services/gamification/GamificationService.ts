import { EventEmitter } from 'events';
import { socketServer } from '../SocketServer.js';
import { User } from '../../models/User.js';
import { ActiveQuest } from '../../models/ActiveQuest.js';

export interface Quest {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    rewardXp: number;
    type: 'chat' | 'poll' | 'watch_time' | 'share';
    completed: boolean;
    icon?: string;
}

export interface UserProgressResponse {
    userId: string;
    xp: number;
    level: number;
    totalXp: number;
    activeQuests: any[];
    achievements: string[];
}

class GamificationService extends EventEmitter {
    // Config
    private readonly XP_PER_CHAT = 10;
    private readonly XP_PER_POLL = 50;
    private readonly XP_PER_MINUTE = 5;

    constructor() {
        super();
        this.startWatchTimeLoop();
    }

    public async getUserProgress(userId: string): Promise<UserProgressResponse> {
        let user = await User.findById(userId);
        if (!user) {
            // Handle anonymous or missing user case - return default but don't create?
            // Usually authMiddleware ensures user exists.
            return {
                userId,
                xp: 0,
                level: 1,
                totalXp: 0,
                activeQuests: [],
                achievements: []
            };
        }

        // Initialize gamification if missing
        if (!user.gamification) {
            user.gamification = { xp: 0, level: 1, totalXp: 0 };
            await user.save();
        }

        // Get active quests
        const activeQuests = await ActiveQuest.find({ 
            userId, 
            expiresAt: { $gt: new Date() } 
        });

        // Ensure user has daily quests if none exist
        if (activeQuests.length === 0) {
            const newQuests = await this.generateDailyQuests(userId);
            return {
                userId,
                xp: user.gamification.xp,
                level: user.gamification.level,
                totalXp: user.gamification.totalXp,
                activeQuests: newQuests,
                achievements: []
            };
        }

        return {
            userId,
            xp: user.gamification.xp,
            level: user.gamification.level,
            totalXp: user.gamification.totalXp,
            activeQuests,
            achievements: []
        };
    }

    public async addXp(userId: string, amount: number, source: string) {
        let user = await User.findById(userId);
        if (!user) return;

        if (!user.gamification) {
            user.gamification = { xp: 0, level: 1, totalXp: 0 };
        }

        const oldLevel = user.gamification.level;
        user.gamification.xp += amount;
        user.gamification.totalXp += amount;

        // Level calculation: Level * 1000 XP required
        const xpForNextLevel = this.getLevelThreshold(user.gamification.level);
        if (user.gamification.xp >= xpForNextLevel) {
            user.gamification.level++;
            user.gamification.xp -= xpForNextLevel;
            
            this.emitLevelUp(userId, user.gamification.level);
        }

        await user.save();

        // Update Quests
        await this.updateQuests(userId, source);

        this.emitUpdate(userId);
    }

    public async getLeaderboard(limit = 10) {
        const topUsers = await User.find({ 'gamification.totalXp': { $gt: 0 } })
            .sort({ 'gamification.totalXp': -1 })
            .limit(limit)
            .select('name avatar gamification');

        return topUsers.map(u => ({
            id: u._id,
            name: u.name,
            avatar: u.avatar,
            xp: u.gamification.totalXp,
            level: u.gamification.level
        }));
    }

    private getLevelThreshold(currentLevel: number): number {
        return currentLevel * 500; // Linear scaling 500, 1000, 1500...
    }

    private async updateQuests(userId: string, source: string) {
        const quests = await ActiveQuest.find({ 
            userId, 
            type: source,
            completed: false,
            expiresAt: { $gt: new Date() }
        });

        for (const quest of quests) {
            quest.current++;
            if (quest.current >= quest.target) {
                quest.completed = true;
                await this.addXp(userId, quest.rewardXp, 'quest_complete');
                socketServer.emitToUser(userId, 'gamification:quest_complete', quest);
            }
            await quest.save();
        }
    }

    private emitLevelUp(userId: string, newLevel: number) {
        socketServer.emitToUser(userId, 'gamification:levelup', { level: newLevel });
        if (newLevel % 5 === 0) {
            socketServer.emitToAll('gamification:shoutout', { userId, level: newLevel });
        }
    }

    private async emitUpdate(userId: string) {
        const progress = await this.getUserProgress(userId);
        socketServer.emitToUser(userId, 'gamification:update', progress);
    }

    private async generateDailyQuests(userId: string): Promise<any[]> {
        const expiresAt = new Date();
        expiresAt.setHours(23, 59, 59, 999);

        const questsData = [
            {
                userId,
                questId: 'daily_chat',
                title: 'Chatterbox',
                description: 'Send 5 messages in chat',
                target: 5,
                rewardXp: 100,
                type: 'chat' as const,
                expiresAt
            },
            {
                userId,
                questId: 'daily_poll',
                title: 'Voter',
                description: 'Participate in 1 poll',
                target: 1,
                rewardXp: 150,
                type: 'poll' as const,
                expiresAt
            }
        ];

        return await ActiveQuest.insertMany(questsData);
    }

    private startWatchTimeLoop() {
        setInterval(async () => {
            const connectedUsers = socketServer.getConnectedUsers();
            for (const userId of connectedUsers) {
                await this.addXp(userId, this.XP_PER_MINUTE, 'watch_time');
            }
        }, 60000);
    }
}

export const gamificationService = new GamificationService();
