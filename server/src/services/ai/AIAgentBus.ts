import { EventEmitter } from 'events';

interface AgentMessage {
    fromAgent: string; // archiveId
    toAgent?: string;  // archiveId, or undefined for broadcast
    type: string;
    payload: any;
    timestamp: number;
}

export class AIAgentBus extends EventEmitter {
    private static instance: AIAgentBus;
    
    private constructor() {
        super();
    }

    public static getInstance(): AIAgentBus {
        if (!AIAgentBus.instance) {
            AIAgentBus.instance = new AIAgentBus();
        }
        return AIAgentBus.instance;
    }

    /**
     * Send a message from one agent to another (or everyone) in a specific project.
     */
    public sendMessage(projectId: string, message: Omit<AgentMessage, 'timestamp'>) {
        const fullMessage: AgentMessage = {
            ...message,
            timestamp: Date.now()
        };
        
        console.log(`[AIAgentBus] [${projectId}] ${message.fromAgent} -> ${message.toAgent || 'ALL'}: ${JSON.stringify(message.payload)}`);
        
        // Emit for the project
        this.emit(`message:${projectId}`, fullMessage);
        
        // If it's a direct message, emit specifically for that agent
        if (message.toAgent) {
            this.emit(`message:${projectId}:${message.toAgent}`, fullMessage);
        }
    }
}

export const aiAgentBus = AIAgentBus.getInstance();
