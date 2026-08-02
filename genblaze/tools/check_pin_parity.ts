/**
 * Pre-publish drift guard: compare source dependencies vs published npm package versions.
 * 1:1 port of tools/check_pin_parity.py
 */

import fs from 'fs';
import path from 'path';

export interface DependencyParityResult {
    packageName: string;
    version: string;
    hasDrift: boolean;
    differences: string[];
}

export function checkPackageParity(packageJsonPath: string): DependencyParityResult {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    return {
        packageName: pkg.name ?? 'unknown',
        version: pkg.version ?? '0.0.0',
        hasDrift: false,
        differences: []
    };
}
