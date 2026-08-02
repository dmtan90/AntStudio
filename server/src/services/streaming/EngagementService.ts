/**
 * Service for managing real-time audience engagement (Polls, Q&A).
 */
export class EngagementService {
    private activePolls: Map<string, {
        id: string;
        question: string;
        options: { label: string, votes: number }[];
        totalVotes: number;
    }> = new Map();

    private qaQueues: Map<string, {
        id: string;
        user: string;
        text: string;
        timestamp: Date;
        isFeatured: boolean;
    }[]> = new Map();

    /**
     * Starts a new poll in a specific room.
     */
    public startPoll(roomId: string, question: string, options: string[]) {
        const poll = {
            id: `poll_${Date.now()}`,
            question,
            options: options.map(o => ({ label: o, votes: 0 })),
            totalVotes: 0
        };
        this.activePolls.set(roomId, poll);
        return poll;
    }

    /**
     * Records a vote for an active poll.
     */
    public submitVote(roomId: string, optionIndex: number) {
        const poll = this.activePolls.get(roomId);
        if (poll && poll.options[optionIndex]) {
            poll.options[optionIndex].votes++;
            poll.totalVotes++;
            return poll;
        }
        return null;
    }

    /**
     * Adds a question to the room's Q&A queue.
     */
    public addQuestion(roomId: string, user: string, text: string) {
        if (!this.qaQueues.has(roomId)) this.qaQueues.set(roomId, []);

        const question = {
            id: `qa_${Date.now()}`,
            user,
            text,
            timestamp: new Date(),
            isFeatured: false
        };

        this.qaQueues.get(roomId)!.push(question);
        return question;
    }

    /**
     * Fetches all engagement data for a room.
     */
    public getRoomData(roomId: string) {
        return {
            poll: this.activePolls.get(roomId) || null,
            qa: this.qaQueues.get(roomId) || []
        };
    }
}

export const engagementService = new EngagementService();
