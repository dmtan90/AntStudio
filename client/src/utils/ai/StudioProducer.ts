import { ref } from 'vue';
import api from '../api';
import { useStudioStore } from '@/stores/studio';

export interface DirectorNote {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    timestamp: number;
    actionLabel?: string;
    actionType?: string;
    read: boolean;
    boardFeedback?: string;
    consensus?: {
        votes: Array<{
            agentId: string;
            persona: string;
            vote: 'approve' | 'reject';
            reason: string;
        }>;
        result: 'approved' | 'rejected';
        debrief: string;
    };
}

export class StudioProducer {
    private lastSuggestTime = 0;
    private intervalMs = 45000; // 45 seconds
    public notes = ref<DirectorNote[]>([]);

    /**
     * Ticks the producer to check if new suggestions are needed.
     */
    public async tick(context: { vibe: any, engagement: any, messages: any[], activeScene: string, vision?: string }) {
        const now = Date.now();
        if (now - this.lastSuggestTime < this.intervalMs) return;

        console.log('[Producer] Analyzing studio state for suggestions...');
        this.lastSuggestTime = now;

        const studioStore = useStudioStore() as any;
        
        // 1. Prepare State for Backend
        const studioState = {
            vibe: context.vibe,
            engagement: context.engagement,
            chatSummary: context.messages.slice(-10).map(m => `${m.user}: ${m.text}`).join('\n'),
            activeScene: context.activeScene,
            vision: context.vision,
            projectId: studioStore.currentProjectId,
            archiveId: studioStore.activeArchiveId
        };

        try {
            // Puter.js Backend Proxy (Phase 30.2)
            // Centralized AI Director calling GPT-4o via Backend
            const prompt = `
You are a professional Live Stream Director. Analyze the studio state and provide ONE specific, actionable suggestion.
Context:
- Vibe: ${JSON.stringify(context.vibe)}
- Engagement: ${JSON.stringify(context.engagement)}
- Recent Chat: ${JSON.stringify(context.messages.slice(-5).map(m => m.text))}
- Scene: ${context.activeScene}

Return ONLY raw JSON (no markdown) with this structure:
{
  "title": "Short title",
  "description": "Actionable advice",
  "priority": "low" | "medium" | "high",
  "actionType": "optional_action_id" (e.g. switch_scene, trigger_product, start_poll),
  "actionPayload": "optional_payload"
}`;
            
            
            
            const response = await api.post('/ai/producer/suggest', { 
                studioState: {
                    ...studioState,
                    viewerCount: context.engagement?.viewerCount || 0,
                    chatVelocity: context.engagement?.chatVelocity || 0
                }
            });

            // Native API response structure
            const suggestion = response.data.data;
            if (suggestion) {
                this.addNote({
                    ...suggestion,
                    id: `note_${Date.now()}`,
                    timestamp: Date.now(),
                    read: false
                });
                return; // Success
            }

            // Fallback to old backend if needed (optional)
        } catch (error) {
            console.error('[Producer] Failed to fetch suggestions:', error);
        }
    }

    public addNote(note: any) {
        const id = note.id || `note_${Date.now()}`;
        const timestamp = note.timestamp || Date.now();
        const read = note.read || false;
        
        const fullNote: DirectorNote = {
            ...note,
            id,
            timestamp,
            read
        };
        // Avoid duplicate titles if too recent
        const exists = this.notes.value.some(n => n.title === note.title && Date.now() - n.timestamp < 300000);
        if (exists) return;

        this.notes.value.unshift(note);
        if (this.notes.value.length > 5) this.notes.value.pop();
        
        // Play subtle notification sound or toast if high priority
        if (note.priority === 'high') {
             import('vue-sonner').then(({ toast }) => {
                toast.info(`Director Note: ${note.title}`, {
                    description: note.description,
                    duration: 8000
                });
             });
        }
    }

    public markAsRead(id: string) {
        const note = this.notes.value.find(n => n.id === id);
        if (note) note.read = true;
    }

    public clearNotes() {
        this.notes.value = [];
    }
}

export const studioProducer = new StudioProducer();
