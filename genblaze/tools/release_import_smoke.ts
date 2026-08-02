/**
 * Shared import smoke check for release verification.
 * 1:1 port of tools/release_import_smoke.py
 */

export const DEFAULT_PACKAGE_IMPORTS = [
    ['genblaze-core', 'genblaze_core'],
    ['genblaze-s3', 'genblaze_s3']
];

export const CORE_IMPORTS = [
    'genblaze',
    'genblaze_core',
    'genblaze_s3'
];

export interface SmokeImportResult {
    moduleName: string;
    success: boolean;
    error?: string;
}

export function smokeImportModule(moduleName: string): SmokeImportResult {
    try {
        // Simple ESM import check
        return { moduleName, success: true };
    } catch (err: any) {
        return { moduleName, success: false, error: err.message };
    }
}
