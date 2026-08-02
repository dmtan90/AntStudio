/**
 * Moderation hooks — content screening before/after generation steps.
 * 1:1 port of pipeline/moderation.py
 */

export interface ModerationResult {
    allowed: boolean;
    reason?: string | null;
    flaggedCategories: string[];
}

export abstract class ModerationHook {
    /** Screen prompt text before generation. Return allowed=false to skip the step (marked FAILED). */
    abstract checkPrompt(prompt: string | null, params: Record<string, any>): ModerationResult;

    /** Screen output assets after generation. Return allowed=false to mark the step as FAILED. */
    abstract checkOutput(assets: any[]): ModerationResult;

    /** Async prompt check. Default wraps sync. */
    async acheckPrompt(prompt: string | null, params: Record<string, any>): Promise<ModerationResult> {
        return this.checkPrompt(prompt, params);
    }

    /** Async output check. Default wraps sync. */
    async acheckOutput(assets: any[]): Promise<ModerationResult> {
        return this.checkOutput(assets);
    }
}

/** Allow-all no-op moderation hook for testing or disabling moderation. */
export class NoOpModerationHook extends ModerationHook {
    checkPrompt(_prompt: string | null, _params: Record<string, any>): ModerationResult {
        return { allowed: true, flaggedCategories: [] };
    }

    checkOutput(_assets: any[]): ModerationResult {
        return { allowed: true, flaggedCategories: [] };
    }
}
