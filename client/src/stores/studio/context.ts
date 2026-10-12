import type { createStudioState } from './state';

/**
 * Shared context passed to each action slice. `fns` is filled with every slice's functions after all
 * slices are created, so cross-slice calls resolve at call time (as hoisted functions did before).
 */
export interface StudioContext {
    state: ReturnType<typeof createStudioState>;
    fns: Record<string, (...args: any[]) => any>;
}
