/**
 * AntStudio AI Management Agent
 * 
 * Entry point for: npx @google/adk run agent.ts
 * 
 * Automatically spawns the AntStudio server + client dev servers,
 * then exports the rootAgent for the ADK runtime.
 * 
 * Mirrors pattern from: google/adk-samples/typescript/agents/customer_service
 */

// import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import { configService, EnvConfig } from '~/utils/ConfigService.js';
import { 
    GLOBAL_INSTRUCTION, 
    PRODUCT_INSTRUCTION,
    PROJECT_INSTRUCTION,
    INFLUENCER_INSTRUCTION,
    PLATFORM_INSTRUCTION,
    LIVESTREAM_INSTRUCTION
} from './prompts.js';
import {
    rateLimitCallback,
    beforeAgent,
    beforeTool,
    afterTool,
} from './shared_libraries/callbacks.js';
import { allTools } from './tools/index.js';
// import { spawn, type ChildProcess } from 'child_process';
// import { join, dirname } from 'path';
// import { fileURLToPath } from 'url';
// import net from 'net';
// import dotenv from 'dotenv';
// import path from 'path';
import { AIModelType } from '~/models/AdminSettings.js';

// const __dirname = dirname(fileURLToPath(import.meta.url));
// const ROOT_DIR = join(__dirname, '../../..');

// // Load env vars from root .env if it exists, falling back to local server .env
// dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// // Resolve GOOGLE_APPLICATION_CREDENTIALS to absolute path if relative
// if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
//     process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../../', process.env.GOOGLE_APPLICATION_CREDENTIALS);
// }

// ─── Combined Instructions ──────────────────────────────────
const COMBINED_INSTRUCTION = [
    GLOBAL_INSTRUCTION,
    PRODUCT_INSTRUCTION,
    PROJECT_INSTRUCTION,
    INFLUENCER_INSTRUCTION,
    PLATFORM_INSTRUCTION,
    LIVESTREAM_INSTRUCTION
].join('\n\n');

// ─── Root Agent ─────────────────────────────────────────────
export const rootAgent = new LlmAgent({
    model: configService.aiDefaultModels?.[AIModelType.AGENT]?.modelId || EnvConfig.geminiModelAgent,
    name: "antstudio_assistant",
    description: 'AntStudio AI Assistant',
    instruction: COMBINED_INSTRUCTION,
    tools: allTools,
    beforeToolCallback: beforeTool,
    afterToolCallback: afterTool,
    beforeModelCallback: rateLimitCallback,
});

// ─── Bootstrap ──────────────────────────────────────────────
async function bootstrap() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     AntStudio AI Agent — Starting      ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('\n✨ AntStudio is running!');
    console.log(`\n📺 Open the app: ${configService.domain}`);
    console.log('💬 Click the floating AI button (bottom-right) to start chatting\n');
    console.log('🤖 Agent ready — you can also type here for CLI mode\n');
}

bootstrap().catch(console.error);
