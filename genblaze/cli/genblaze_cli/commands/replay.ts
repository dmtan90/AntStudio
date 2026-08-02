/**
 * Replay command — re-execute a pipeline from a manifest file.
 * 1:1 port of cli/genblaze_cli/commands/replay.py
 */

import { loadStandaloneJsonManifest } from '../manifest_io.js';

export async function runReplayCommand(manifestFilePath: string, options: { dryRun?: boolean; force?: boolean } = {}): Promise<void> {
    const manifest = loadStandaloneJsonManifest(manifestFilePath);
    const run = manifest.runId;

    console.log(`Run:    ${run}`);
    console.log(`Steps:  ${manifest.steps.length}`);
    console.log(`Hash:   ${manifest.canonicalHash}`);

    if (options.dryRun !== false) {
        console.log('\nDry run — no steps executed. Use --no-dry-run to execute.');
        return;
    }

    console.log('\nReplaying pipeline...');
}
