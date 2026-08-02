/**
 * Shared CLI manifest loading helpers.
 * 1:1 port of cli/genblaze_cli/manifest_io.py
 */

import fs from 'fs';
import path from 'path';
import { parseManifest, Manifest } from '../../libs/core/genblaze_core/models/manifest.js';

const MAX_MANIFEST_BYTES = 10 * 1024 * 1024; // 10 MB

export function loadStandaloneJsonManifest(filePath: string): Manifest {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_MANIFEST_BYTES) {
        throw new Error(`Manifest JSON exceeds size limit: ${stat.size} > ${MAX_MANIFEST_BYTES} bytes`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return parseManifest(data);
}

export function extractManifestFromFile(filePath: string): Manifest {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
        return loadStandaloneJsonManifest(filePath);
    }
    // Fallback JSON parse
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseManifest(JSON.parse(content));
}
