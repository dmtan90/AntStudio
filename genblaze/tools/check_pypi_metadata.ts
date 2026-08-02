/**
 * CI gate: every published package in monorepo has consistent metadata in package.json.
 * 1:1 port of tools/check_pypi_metadata.py
 */

import fs from 'fs';
import path from 'path';

export interface MetadataCheckResult {
    packagePath: string;
    packageName: string;
    valid: boolean;
    errors: string[];
}

export function checkPackageMetadata(packageJsonPath: string): MetadataCheckResult {
    const errors: string[] = [];
    if (!fs.existsSync(packageJsonPath)) {
        return { packagePath: packageJsonPath, packageName: 'unknown', valid: false, errors: ['File does not exist'] };
    }

    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    let pkg: any;
    try {
        pkg = JSON.parse(content);
    } catch {
        return { packagePath: packageJsonPath, packageName: 'unknown', valid: false, errors: ['Invalid JSON'] };
    }

    if (!pkg.name) errors.push('Missing "name" field');
    if (!pkg.version) errors.push('Missing "version" field');
    if (!pkg.description) errors.push('Missing "description" field');
    if (!pkg.license) errors.push('Missing "license" field');

    return {
        packagePath: packageJsonPath,
        packageName: pkg.name ?? 'unknown',
        valid: errors.length === 0,
        errors
    };
}
