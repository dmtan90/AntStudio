import axios from 'axios';
import { EnvConfig } from '~/utils/ConfigService.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Picks which Antigravity model to call from what the gateway currently offers, instead of passing
 * the Gemini model id straight through (Google renames/retires gateway models, e.g.
 * gemini-3.7-flash-tiered -> gemini-3.8-flash-tiered, and the gateway answers 404 for unknown ids).
 * Ported from openvideo/apps/shine (AntigravityModelSelector).
 *
 * ANTIGRAVITY_MODEL accepts:
 *  - "auto" (default): the requested model when offered, else the newest of its family, else the
 *    newest model of the preferred families below
 *  - a family, e.g. "flash-tiered" or "pro-high": newest model of that family
 *  - an exact id, e.g. "gemini-3.8-flash-tiered": pinned while offered, else newest of its family
 */

const CODE_ASSIST_ENDPOINT = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
/** Families tried in order for "auto" (and as the last resort for any preference). */
export const AUTO_FAMILIES = ['flash-tiered', 'flash', 'flash-high', 'flash-medium'];
/** Used only when the model list can't be fetched and nothing was resolved before. */
const LAST_RESORT_MODEL = 'gemini-3-flash';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface ParsedModel { id: string; version: number[]; family: string }

export function parseModelId(id: string): ParsedModel | null {
    const m = /^gemini-(\d+(?:\.\d+)*)-(.+)$/.exec(id.trim().toLowerCase());
    if (!m) return null;
    return { id, version: m[1].split('.').map(Number), family: m[2] };
}

function compareVersionsDesc(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (b[i] ?? 0) - (a[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

export function newestInFamily(family: string, offered: string[]): string | null {
    const matches = offered
        .map(parseModelId)
        .filter((p): p is ParsedModel => !!p && p.family === family)
        .sort((a, b) => compareVersionsDesc(a.version, b.version));
    return matches[0]?.id ?? null;
}

/** Pure selection: the model to use for `preference` given the offered ids, or null if none fits. */
export function selectModel(preference: string, offered: string[]): string | null {
    const pref = (preference || 'auto').trim().toLowerCase();
    const fromFamilies = (families: string[]) => {
        for (const family of families) {
            const found = newestInFamily(family, offered);
            if (found) return found;
        }
        return null;
    };

    if (pref === 'auto') return fromFamilies(AUTO_FAMILIES);

    const exact = parseModelId(pref);
    if (exact) {
        if (offered.includes(pref)) return pref; // pinned
        return fromFamilies([exact.family, ...AUTO_FAMILIES]);
    }

    // A family name such as "flash-tiered" or "pro-high"
    return fromFamilies([pref, ...AUTO_FAMILIES]);
}

/** Lists the model ids the gateway currently offers (no padding with assumed models). */
export async function listAntigravityModelIds(token: string, projectId: string): Promise<string[]> {
    const response = await axios.post(
        `${CODE_ASSIST_ENDPOINT}/v1internal:fetchAvailableModels`,
        { project: projectId || 'aicode-consumers' },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'antigravity/1.13.3 windows/amd64',
            },
            timeout: 15000,
        }
    );
    return Object.keys(response.data?.models || {});
}

interface SelectionState {
    model: string;
    offered: string[];
    resolvedAt: number;
    source: 'gateway' | 'fallback';
}

class AntigravityModelSelector {
    /** Cached choice per preference (the requested model differs between callers) */
    private states = new Map<string, SelectionState>();
    private inflight = new Map<string, Promise<string>>();

    /** The configured preference, or the requested Gemini model when ANTIGRAVITY_MODEL is "auto". */
    preferenceFor(requestedModel?: string): string {
        const configured = String(EnvConfig.antigravityModel || 'auto').trim().toLowerCase();
        if (configured !== 'auto') return configured;
        return requestedModel && parseModelId(requestedModel) ? requestedModel.trim().toLowerCase() : 'auto';
    }

    getState(preference: string): SelectionState | undefined {
        return this.states.get(preference);
    }

    /** Drop the cached choices (e.g. after the gateway answered 404). */
    invalidate(): void {
        for (const state of this.states.values()) state.resolvedAt = 0;
    }

    /** The model to call, re-checking the gateway's list when the cache is stale or `force` is set. */
    async resolve(token: string, projectId: string, requestedModel?: string, force = false): Promise<string> {
        const preference = this.preferenceFor(requestedModel);
        const cached = this.states.get(preference);
        if (!force && cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
            return cached.model;
        }
        let pending = this.inflight.get(preference);
        if (!pending) {
            pending = this.refresh(token, projectId, preference).finally(() => this.inflight.delete(preference));
            this.inflight.set(preference, pending);
        }
        return pending;
    }

    private async refresh(token: string, projectId: string, preference: string): Promise<string> {
        const previous = this.states.get(preference);
        try {
            const offered = await listAntigravityModelIds(token, projectId);
            const model = selectModel(preference, offered);
            if (!model) throw new Error(`no offered model matches "${preference}" (offered: ${offered.join(', ') || 'none'})`);
            if (model !== previous?.model) {
                Logger.info(`[AntigravityModelSelector] Using "${model}" for "${preference}" (${offered.length} models offered).`, 'AntigravityModelSelector');
            }
            this.states.set(preference, { model, offered, resolvedAt: Date.now(), source: 'gateway' });
            return model;
        } catch (err: any) {
            // Keep working with the last known choice; retry the lookup after a short delay
            const fallback = previous?.model || (parseModelId(preference) ? preference : LAST_RESORT_MODEL);
            Logger.warn(`[AntigravityModelSelector] Model lookup failed (${err.message}); using "${fallback}".`, 'AntigravityModelSelector');
            this.states.set(preference, {
                model: fallback,
                offered: previous?.offered || [],
                resolvedAt: Date.now() - CACHE_TTL_MS + 5 * 60 * 1000,
                source: 'fallback',
            });
            return fallback;
        }
    }
}

export const antigravityModelSelector = new AntigravityModelSelector();
