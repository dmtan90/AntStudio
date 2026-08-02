/**
 * Extract command — print embedded manifest from a media file.
 * 1:1 port of cli/genblaze_cli/commands/extract.py
 */

import fs from 'fs';
import { extractManifestFromFile } from '../manifest_io.js';
import { canonicalJson } from '../../../libs/core/genblaze_core/canonical/json.js';

export function runExtractCommand(filePath: string, options: { format?: 'json' | 'summary'; output?: string } = {}): void {
    const format = options.format ?? 'json';
    const manifest = extractManifestFromFile(filePath);

    if (format === 'json') {
        const jsonStr = canonicalJson(manifest);
        if (options.output) {
            fs.writeFileSync(options.output, jsonStr, 'utf-8');
        } else {
            console.log(jsonStr);
        }
    } else {
        console.log(`Run ID:    ${manifest.runId}`);
        console.log(`Steps:     ${manifest.steps.length}`);
        console.log(`Hash:      ${manifest.canonicalHash}`);
        console.log(`Verified:  true`);
    }
}
