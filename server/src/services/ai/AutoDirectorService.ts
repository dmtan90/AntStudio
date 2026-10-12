import { EventEmitter } from 'events';

import { Logger } from '../../utils/Logger.js';

interface DirectorState {
    isEnabled: boolean;
    currentFocus: string; // 'host' | 'screen' | 'wide' | 'guest_ID'
    lastSwitchTime: number;
    activeSpeaker: string | null;
    isScreenSharing: boolean;
    silenceTimer: NodeJS.Timeout | null;
}

export interface DirectorCut {
    ownerId: string;
    target: string;
    timestamp: number;
    reason: string;
}

/**
 * Auto camera director. State is kept per studio owner (user ID): previously a single global
 * state meant one user's toggle or voice activity drove every studio's cuts.
 * Emits 'cut' with the owner ID so the socket layer can target only that user.
 */
class AutoDirectorService extends EventEmitter {
    private states = new Map<string, DirectorState>();

    // Configuration
    private readonly MIN_SWITCH_DELAY = 2000; // Minimum time between cuts (ms)
    private readonly SILENCE_TIMEOUT = 5000; // Time before cutting to wide shot active

    constructor() {
        super();
    }

    private getState(ownerId: string): DirectorState {
        let state = this.states.get(ownerId);
        if (!state) {
            state = {
                isEnabled: false,
                currentFocus: 'host',
                lastSwitchTime: 0, // no cut yet: the first switch isn't debounced
                activeSpeaker: null,
                isScreenSharing: false,
                silenceTimer: null
            };
            this.states.set(ownerId, state);
        }
        return state;
    }

    public toggleDirector(ownerId: string, enabled: boolean) {
        const state = this.getState(ownerId);
        state.isEnabled = enabled;
        Logger.info(`[AutoDirector] ${ownerId} state: ${enabled ? 'ON' : 'OFF'}`);
        if (!enabled) {
            this.clearSilenceTimer(state);
            this.states.delete(ownerId); // nothing to keep while disabled
        }
    }

    public handleVoiceActivity(ownerId: string, sourceId: string, level: number) {
        const state = this.states.get(ownerId);
        if (!state?.isEnabled) return;

        // Threshold for considering it "speaking"
        const SPEAKING_THRESHOLD = 0.15; // Normalized 0-1

        if (level > SPEAKING_THRESHOLD) {
            state.activeSpeaker = sourceId;
            this.clearSilenceTimer(state);

            // Heuristic: If screen share is active, don't switch away unless it's a very strong interrupt (TODO)
            if (state.isScreenSharing) return;

            this.considerSwitch(ownerId, state, sourceId);

            // Reset silence timer
            state.silenceTimer = setTimeout(() => {
                state.activeSpeaker = null;
                this.considerSwitch(ownerId, state, 'wide');
            }, this.SILENCE_TIMEOUT);
        }
    }

    public handleReaction(ownerId: string, sourceId: string, type: string) {
        const state = this.states.get(ownerId);
        if (!state?.isEnabled) return;
        Logger.info(`[AutoDirector] Reaction from ${sourceId}: ${type}`);

        // Reactions trigger a quick cut
        this.considerSwitch(ownerId, state, sourceId, true);

        // Return to previous or wide after 3 seconds
        setTimeout(() => {
            if (state.currentFocus === sourceId) {
                this.considerSwitch(ownerId, state, state.activeSpeaker || 'wide');
            }
        }, 3000);
    }

    public setScreenShareStatus(ownerId: string, isActive: boolean) {
        const state = this.getState(ownerId);
        state.isScreenSharing = isActive;
        if (isActive && state.isEnabled) {
            this.considerSwitch(ownerId, state, 'screen', true);
        }
    }

    private considerSwitch(ownerId: string, state: DirectorState, targetId: string, force = false) {
        const now = Date.now();

        // Don't switch to the same view
        if (state.currentFocus === targetId) return;

        // Debounce switching unless forced (like a reaction or screen share start)
        if (!force && (now - state.lastSwitchTime < this.MIN_SWITCH_DELAY)) {
            return;
        }

        this.executeCut(ownerId, state, targetId);
    }

    private executeCut(ownerId: string, state: DirectorState, targetId: string) {
        state.currentFocus = targetId;
        state.lastSwitchTime = Date.now();

        Logger.info(`[AutoDirector] Cutting to: ${targetId} (owner ${ownerId})`);

        // Emit event for socket service to pick up
        const cut: DirectorCut = {
            ownerId,
            target: targetId,
            timestamp: Date.now(),
            reason: 'auto-logic'
        };
        this.emit('cut', cut);
    }

    private clearSilenceTimer(state: DirectorState) {
        if (state.silenceTimer) {
            clearTimeout(state.silenceTimer);
            state.silenceTimer = null;
        }
    }
}

export const autoDirectorService = new AutoDirectorService();
