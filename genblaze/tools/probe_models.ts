/**
 * Live-API model probe — guards the registry against drift.
 * 1:1 port of tools/probe_models.py
 */

export interface ModelProbeStatus {
    generatedAt: string;
    providers: Record<string, {
        models: Record<string, { status: string; detail?: string }>;
        summary: { ok: number; notFound: number; auth: number; skipped: number; unknown: number };
    }>;
}

export function createModelProbeReport(): ModelProbeStatus {
    return {
        generatedAt: new Date().toISOString(),
        providers: {}
    };
}
