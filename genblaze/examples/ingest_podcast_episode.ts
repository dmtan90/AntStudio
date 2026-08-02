/**
 * Ingest podcast episode example.
 * 1:1 port of examples/ingest_podcast_episode.py
 */

import { AssemblyAIProvider } from '../libs/connectors/assemblyai/genblaze_assemblyai/index.js';

async function main() {
    console.log('🎙️ Running Ingest Podcast Episode Example...');
    const aai = new AssemblyAIProvider();
    console.log('AssemblyAI provider initialized:', aai.name);
}

main().catch(console.error);
