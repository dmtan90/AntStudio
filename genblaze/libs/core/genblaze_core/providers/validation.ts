/**
 * ValidationResult — the typed answer to "is this slug usable?".
 * 1:1 port of providers/validation.py
 */

export enum ValidationSource {
    USER = 'user',
    FAMILY = 'family',
    DISCOVERY = 'discovery',
    PROBE = 'probe',
    FALLBACK = 'fallback'
}

export enum ValidationOutcome {
    OK_AUTHORITATIVE = 'ok_authoritative',
    OK_PROVISIONAL = 'ok_provisional',
    UNKNOWN_PERMISSIVE = 'unknown_permissive',
    NOT_FOUND = 'not_found'
}

export interface ValidationResult {
    modelId: string;
    outcome: ValidationOutcome;
    source: ValidationSource;
    message?: string | null;
    spec?: any;
}
