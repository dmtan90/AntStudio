export class AgentEventBus {
    private static instance: AgentEventBus;
    private toolCallHandlers: ((personaId: string, toolCall: any) => void)[] = [];

    private constructor() {}

    public static getInstance(): AgentEventBus {
        if (!AgentEventBus.instance) {
            AgentEventBus.instance = new AgentEventBus();
        }
        return AgentEventBus.instance;
    }

    public registerHandler(handler: (personaId: string, toolCall: any) => void) {
        if (!this.toolCallHandlers.includes(handler)) {
            this.toolCallHandlers.push(handler);
        }
    }

    public removeHandler(handler: (personaId: string, toolCall: any) => void) {
        this.toolCallHandlers = this.toolCallHandlers.filter(h => h !== handler);
    }

    public dispatchToolCall(personaId: string, toolCall: any) {
        this.toolCallHandlers.forEach(handler => handler(personaId, toolCall));
    }

    public parseMetadataToToolCalls(personaId: string, metadata: any) {
        if (!metadata) return;
        const virtualToolCalls: any[] = [];

        if (metadata.emotion) {
            virtualToolCalls.push({
                id: `auto_emotion_${Date.now()}`,
                name: 'change_expression',
                args: { expression: metadata.emotion }
            });
        }

        if (metadata.gesture && metadata.gesture !== 'normal') {
            virtualToolCalls.push({
                 id: `auto_gesture_${Date.now()}`,
                 name: 'play_animation',
                 args: { animation: metadata.gesture }
            });
        }

        if (metadata.action === 'perform_song') {
            virtualToolCalls.push({
                 id: `auto_action_${Date.now()}`,
                 name: 'perform_song',
                 args: metadata.actionPayload
            });
        } else if (metadata.action === 'stop_performance') {
            virtualToolCalls.push({
                 id: `auto_action_${Date.now()}`,
                 name: 'stop_performance',
                 args: {}
            });
        }

        if (virtualToolCalls.length > 0) {
            console.log(`[AgentEventBus] Converted metadata to ${virtualToolCalls.length} tool calls`);
            this.dispatchToolCall(personaId, { functionCalls: virtualToolCalls });
        }
    }
}
