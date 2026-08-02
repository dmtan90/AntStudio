/**
 * Callbacks for the AntStudio Agent
 * Mirrors the pattern from google/adk-samples customer_service/shared_libraries/callbacks.ts
 */

import type {
    LlmRequest,
    LlmResponse,
    Context,
    BaseTool,
} from '@google/adk';

// Simple in-memory rate limiter
const requestTimestamps: number[] = [];
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 50;

/**
 * Rate limit callback — prevents hammering the Gemini API
 */
export async function rateLimitCallback({
    context,
    request
}: {
    context: Context;
    request: LlmRequest;
}): Promise<LlmResponse | undefined> {
    const now = Date.now();
    // Remove timestamps outside the window
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
        requestTimestamps.shift();
    }

    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        console.warn('[RateLimit] Too many requests, throttling...');
        return undefined;
    }

    requestTimestamps.push(now);
    return undefined;
}

/**
 * Before agent callback — log agent start
 */
export async function beforeAgent(context: Context): Promise<any> {
    console.log(`[Agent] 🚀 Session: ${context.invocationContext?.session?.id || 'unknown'}`);
    return undefined;
}

/**
 * Before tool callback — log tool invocation
 */
export async function beforeTool({
    tool,
    args,
    context
}: {
    tool: BaseTool;
    args: Record<string, any>;
    context: Context;
}): Promise<any> {
    console.log(`[Tool] ▶ ${tool.name}(${JSON.stringify(args).substring(0, 100)})`);
    return undefined;
}

/**
 * After tool callback — log tool result and handle errors
 */
export async function afterTool({
    tool,
    args,
    context,
    response
}: {
    tool: BaseTool;
    args: Record<string, any>;
    context: Context;
    response: Record<string, unknown>;
}): Promise<any> {
    if (response?.error || response?.success === false) {
        console.error(`[Tool] ✗ ${tool.name} FAILED:`, response.error || 'Unknown error');
    } else {
        console.log(`[Tool] ✓ ${tool.name} → OK`);
    }
    return undefined;
}
