/**
 * Plan-document writer and drift-guarding validator for the batch maintainer.
 * 1:1 port of tools/batch_plandoc.py
 */

import crypto from 'crypto';

export const META_OPEN = '<!-- BATCH-PLAN-META';
export const META_CLOSE = 'BATCH-PLAN-META -->';

export interface PlanMeta {
    base_sha: string;
    token: string;
    plan: any;
}

export function computePlanToken(baseSha: string, clusters: any[]): string {
    const sortedClusters = [...clusters].map(c => ({
        issues: [...(c.issues ?? [])].sort((a, b) => a - b),
        defer_reason: c.defer_reason ?? ''
    })).sort((a, b) => (a.issues[0] ?? 0) - (b.issues[0] ?? 0));

    const payload = JSON.stringify({ baseSha, clusters: sortedClusters });
    return crypto.createHash('sha256').update(payload).digest('hex');
}

export function embedMeta(markdown: string, meta: PlanMeta): string {
    const metaBlock = `${META_OPEN}\n${JSON.stringify(meta, null, 2)}\n${META_CLOSE}`;
    return `${markdown.trim()}\n\n${metaBlock}\n`;
}

export function extractMeta(markdown: string): PlanMeta | null {
    const startIdx = markdown.indexOf(META_OPEN);
    const endIdx = markdown.indexOf(META_CLOSE);
    if (startIdx === -1 || endIdx === -1) return null;

    const jsonStr = markdown.slice(startIdx + META_OPEN.length, endIdx).trim();
    try {
        return JSON.parse(jsonStr) as PlanMeta;
    } catch {
        return null;
    }
}
