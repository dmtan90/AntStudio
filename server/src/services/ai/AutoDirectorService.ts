import { EventEmitter } from 'events';

interface DirectorState {
    isEnabled: boolean;
    currentFocus: string; // 'host' | 'screen' | 'wide' | 'guest_ID'
    lastSwitchTime: number;
    activeSpeaker: string | null;
    isScreenSharing: boolean;
}

class AutoDirectorService extends EventEmitter {
    private state: DirectorState = {
        isEnabled: false,
        currentFocus: 'host',
        lastSwitchTime: Date.now(),
        activeSpeaker: null,
        isScreenSharing: false
    };

    // Configuration
    private readonly MIN_SWITCH_DELAY = 2000; // Minimum time between cuts (ms)
    private readonly SILENCE_TIMEOUT = 5000; // Time before cutting to wide shot active
    private silenceTimer: NodeJS.Timeout | null = null;

    constructor() {
        super();
    }

    public toggleDirector(enabled: boolean) {
        this.state.isEnabled = enabled;
        console.log(`[AutoDirector] State: ${enabled ? 'ON' : 'OFF'}`);
        if (!enabled) {
            this.clearSilenceTimer();
        }
    }

    public handleVoiceActivity(sourceId: string, level: number) {
        if (!this.state.isEnabled) return;
        
        // Threshold for considering it "speaking"
        const SPEAKING_THRESHOLD = 0.15; // Normalized 0-1
        
        if (level > SPEAKING_THRESHOLD) {
            this.state.activeSpeaker = sourceId;
            this.clearSilenceTimer();
            
            // Heuristic: If screen share is active, don't switch away unless it's a very strong interrupt (TODO)
            if (this.state.isScreenSharing) return;

            this.considerSwitch(sourceId);

            // Reset silence timer
            this.silenceTimer = setTimeout(() => {
                this.state.activeSpeaker = null;
                this.considerSwitch('wide');
            }, this.SILENCE_TIMEOUT);
        }
    }

    public handleReaction(sourceId: string, type: string) {
        if (!this.state.isEnabled) return;
        console.log(`[AutoDirector] Reaction from ${sourceId}: ${type}`);
        
        // Reactions trigger a quick cut
        this.considerSwitch(sourceId, true);
        
        // Return to previous or wide after 3 seconds
        setTimeout(() => {
             if (this.state.currentFocus === sourceId) {
                 this.considerSwitch(this.state.activeSpeaker || 'wide');
             }
        }, 3000);
    }

    public setScreenShareStatus(isActive: boolean) {
        this.state.isScreenSharing = isActive;
        if (isActive && this.state.isEnabled) {
            this.considerSwitch('screen', true);
        }
    }

    private considerSwitch(targetId: string, force = false) {
        const now = Date.now();
        
        // Don't switch to the same view
        if (this.state.currentFocus === targetId) return;

        // Debounce switching unless forced (like a reaction or screen share start)
        if (!force && (now - this.state.lastSwitchTime < this.MIN_SWITCH_DELAY)) {
            return;
        }

        this.executeCut(targetId);
    }

    private executeCut(targetId: string) {
        this.state.currentFocus = targetId;
        this.state.lastSwitchTime = Date.now();
        
        console.log(`[AutoDirector] Cutting to: ${targetId}`);
        
        // Emit event for socket service to pick up
        this.emit('cut', {
            target: targetId,
            timestamp: Date.now(),
            reason: 'auto-logic'
        });
    }

    private clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
}

export const autoDirectorService = new AutoDirectorService();
