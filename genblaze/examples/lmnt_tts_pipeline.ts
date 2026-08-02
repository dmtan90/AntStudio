/**
 * LMNT TTS pipeline example.
 * 1:1 port of examples/lmnt_tts_pipeline.py
 */

import { LMNTProvider } from '../libs/connectors/lmnt/genblaze_lmnt/index.js';

async function main() {
    console.log('🔊 Running LMNT TTS Pipeline Example...');
    const lmnt = new LMNTProvider();
    console.log('LMNT provider initialized:', lmnt.name);
}

main().catch(console.error);
