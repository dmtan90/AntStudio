#!/usr/bin/env node

/**
 * Genblaze CLI main entry point.
 * 1:1 port of cli/genblaze_cli/main.py
 */

import process from 'process';
import { runVerifyCommand } from './commands/verify.js';
import { runExtractCommand } from './commands/extract.js';
import { runReplayCommand } from './commands/replay.js';
import { runIndexCommand } from './commands/index.js';

const args = process.argv.slice(2);
const command = args[0];

console.log('🔥 Genblaze CLI (TypeScript/JavaScript v0.3.2-ts)');

if (!command || command === '--help' || command === '-h') {
    console.log(`
Usage: genblaze <command> [options]

Commands:
  verify <manifest.json> [--fetch]    Verify canonical SHA-256 hash of provenance manifest
  extract <media_file>                Extract embedded Genblaze provenance metadata hash from media file
  replay <manifest.json>              Reconstruct canonical run pipeline execution plan from manifest
  index <manifest.json>               Write manifest data to Parquet sink for querying
`);
    process.exit(0);
}

const targetFile = args[1];

switch (command) {
    case 'verify':
        if (!targetFile) {
            console.error('Error: Missing manifest file argument.');
            process.exit(1);
        }
        runVerifyCommand(targetFile, {
            fetch: args.includes('--fetch'),
            hashOnly: args.includes('--hash-only')
        });
        break;

    case 'extract':
        if (!targetFile) {
            console.error('Error: Missing media file argument.');
            process.exit(1);
        }
        runExtractCommand(targetFile);
        break;

    case 'replay':
        if (!targetFile) {
            console.error('Error: Missing manifest file argument.');
            process.exit(1);
        }
        runReplayCommand(targetFile, { dryRun: !args.includes('--no-dry-run') }).catch(err => {
            console.error(err.message);
            process.exit(1);
        });
        break;

    case 'index':
        if (!targetFile) {
            console.error('Error: Missing manifest file argument.');
            process.exit(1);
        }
        runIndexCommand(targetFile);
        break;

    default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
}
