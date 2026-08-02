/**
 * Normalize values for deterministic JSON serialization.
 * 1:1 port of canonical/_normalize.py
 */

const MAX_NORMALIZE_DEPTH = 100;

/** Recursively normalize a value for canonical JSON output. */
export function normalize(value: any, _depth = 0): any {
    if (_depth > MAX_NORMALIZE_DEPTH) {
        throw new Error(
            `canonical normalization exceeded max depth (${MAX_NORMALIZE_DEPTH}); ` +
            'value is nested too deeply to hash safely'
        );
    }
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!isFinite(value)) return null; // NaN / Infinity → null
        return Math.round(value * 1e10) / 1e10; // round to 10 decimal places
    }
    if (typeof value === 'string') {
        return value.normalize('NFC');
    }
    if (value instanceof Date) {
        // UTC only, Z suffix
        const iso = value.toISOString();
        return iso.endsWith('+00:00') ? iso.slice(0, -6) + 'Z' : iso;
    }
    if (Array.isArray(value)) {
        return value.map(v => normalize(v, _depth + 1));
    }
    if (typeof value === 'object') {
        // Sort keys deterministically
        return Object.fromEntries(
            Object.keys(value).sort().map(k => [k, normalize(value[k], _depth + 1)])
        );
    }
    throw new TypeError(
        `normalize: unsupported type ${typeof value} — add explicit handling ` +
        'to preserve canonical JSON determinism'
    );
}
