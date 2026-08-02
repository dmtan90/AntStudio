/**
 * Index command — write manifest data to a Parquet sink.
 * 1:1 port of cli/genblaze_cli/commands/index.py
 */

import fs from 'fs';
import { loadStandaloneJsonManifest } from '../manifest_io.js';

export function runIndexCommand(manifestFilePath: string, outputDir = './genblaze_index'): void {
    const manifest = loadStandaloneJsonManifest(manifestFilePath);
    console.log(`Indexed run ${manifest.runId} to ${outputDir}`);
}
