<template>
    <div class="director-notes" v-if="notes.length > 0">
        <div class="notes-header">
            <div class="flex items-center gap-2">
                <div class="indicator pulse"></div>
                <span class="title">Director Notes</span>
            </div>
            <button @click="clearAll" class="clear-btn">Clear</button>
        </div>
        
        <div class="notes-list scrollbar-hide">
            <TransitionGroup name="note-list">
                <div 
                    v-for="note in notes" 
                    :key="note.id" 
                    class="note-card"
                    :class="[note.priority, { read: note.read }]"
                    @click="markRead(note)"
                >
                    <div class="note-priority-tag">{{ note.priority }}</div>
                    <h4 class="note-title">{{ note.title }}</h4>
                    <p class="note-desc">{{ note.description }}</p>
                    
                    <!-- AI Board Consensus Feedback -->
                    <div v-if="note.boardFeedback" class="board-feedback mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div class="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Board Consensus: REJECTED</div>
                        <p class="text-[9px] text-white/60 leading-tight italic">"{{ note.boardFeedback }}"</p>
                    </div>

                    <div v-if="note.consensus && note.consensus.votes" class="board-consensus mt-3 flex gap-1">
                        <div v-for="vote in note.consensus.votes" :key="vote.agentId" 
                            class="agent-vote w-2 h-2 rounded-full"
                            :class="vote.vote === 'approve' ? 'bg-green-500' : 'bg-red-500'"
                            :title="`${vote.persona}: ${vote.reason}`">
                        </div>
                    </div>
                    
                    <div v-if="note.actionLabel" class="note-action">
                        <button class="action-btn" @click.stop="triggerAction(note)">
                            {{ note.actionLabel }}
                        </button>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { studioProducer } from '@/utils/ai/StudioProducer';

const notes = computed(() => studioProducer.notes.value);

const markRead = (note: any) => {
    studioProducer.markAsRead(note.id);
};

const clearAll = () => {
    studioProducer.clearNotes();
};

const triggerAction = (note: any) => {
    // Implement action triggers (e.g., start poll, switch scene)
    console.log(`[Producer] Triggering action: ${note.actionType}`);
    window.dispatchEvent(new CustomEvent('producer:action', { detail: { type: note.actionType, payload: note } }));
};
</script>

<style lang="scss" scoped>
.director-notes {
    position: absolute;
    top: 80px;
    right: 340px;
    width: 280px;
    max-height: 400px;
    z-index: 100;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;

    .title {
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: rgba(255, 255, 255, 0.5);
    }

    .clear-btn {
        font-size: 8px;
        text-transform: uppercase;
        font-weight: 800;
        color: rgba(255, 255, 255, 0.3);
        background: none;
        border: none;
        cursor: pointer;
        &:hover { color: #fff; }
    }
}

.indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3b82f6;
    
    &.pulse {
        animation: pulse 2s infinite;
    }
}

@keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.notes-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
}

.note-card {
    background: rgba(15, 15, 15, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;

    &:hover {
        background: rgba(25, 25, 25, 0.95);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateX(-4px);
    }

    &.read {
        opacity: 0.6;
    }

    &.high {
        border-left: 4px solid #ef4444;
    }
    &.medium {
        border-left: 4px solid #f59e0b;
    }
    &.low {
        border-left: 4px solid #3b82f6;
    }

    .note-priority-tag {
        position: absolute;
        top: 12px;
        right: 12px;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
        opacity: 0.3;
    }

    .note-title {
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 4px;
        color: #fff;
    }

    .note-desc {
        font-size: 11px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.6);
    }

    .note-action {
        margin-top: 12px;
        .action-btn {
            width: 100%;
            height: 28px;
            background: #3b82f6;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            &:hover { background: #2563eb; }
        }
    }
}

/* Animations */
.note-list-enter-active,
.note-list-leave-active {
    transition: all 0.5s ease;
}
.note-list-enter-from {
    opacity: 0;
    transform: translateX(30px);
}
.note-list-leave-to {
    opacity: 0;
    transform: scale(0.9);
}
</style>
