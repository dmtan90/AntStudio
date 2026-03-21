import api from '@/utils/api';

export interface FactCheckResult {
    claim: string;
    isAccurate: boolean;
    confidence: number;
    explanation: string;
    sources?: string[];
    timestamp: number;
}

class MiniEmitter {
    private listeners: Record<string, Array<(...args: any[]) => void>> = {};

    on(event: string, listener: (...args: any[]) => void) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(listener);
    }

    emit(event: string, ...args: any[]) {
        (this.listeners[event] || []).forEach(fn => fn(...args));
    }

    off(event: string, listener: (...args: any[]) => void) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(fn => fn !== listener);
        }
    }
}

export class FactCheckingService extends MiniEmitter {
    private static instance: FactCheckingService;
    private isProcessing: boolean = false;
    private recentClaims: Set<string> = new Set();
    private confidenceThreshold = 0.8; 
    private factCheckCooldownMs = 8000;

    private constructor() {
        super();
    }

    public static getInstance(): FactCheckingService {
        if (!FactCheckingService.instance) {
            FactCheckingService.instance = new FactCheckingService();
        }
        return FactCheckingService.instance;
    }

    public async analyzeStatement(statement: string, context?: string): Promise<void> {
        if (!statement || statement.trim().length < 15) return;
        if (this.isProcessing) return;

        const claimHash = statement.toLowerCase().trim();
        if (this.recentClaims.has(claimHash)) return;

        this.recentClaims.add(claimHash);
        if (this.recentClaims.size > 50) {
            const iterator = this.recentClaims.values();
            this.recentClaims.delete(iterator.next().value);
        }

        try {
            this.isProcessing = true;
            this.emit('fact:processing', statement);

            const completionPayload = {
                promptId: 'ai/fact_check',
                variables: {
                    statement,
                    context: context || 'General Live Stream'
                },
                response_format: { type: "json_object" }
            };

            const response = await api.post('/ai/llm/completion', completionPayload);
            
            if (response.data && response.data.completion) {
                try {
                    const result: Omit<FactCheckResult, 'timestamp'> = JSON.parse(response.data.completion);
                    
                    const fullResult: FactCheckResult = {
                        ...result,
                        timestamp: Date.now()
                    };

                    if (fullResult.confidence >= this.confidenceThreshold) {
                        this.emit('fact:verified', fullResult);
                    }
                } catch (parseError) {
                    console.error('[FactCheck] Failed to parse JSON response:', parseError);
                }
            }
        } catch (error) {
            console.error('[FactCheck] Error analyzing statement:', error);
            this.emit('fact:error', error);
        } finally {
            setTimeout(() => {
                this.isProcessing = false;
            }, this.factCheckCooldownMs);
        }
    }
}

export const factCheckingService = FactCheckingService.getInstance();
