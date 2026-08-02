/**
 * Standalone GMICloud chat wrapper over the OpenAI-compatible inference endpoint.
 * 1:1 port of connectors/gmicloud/genblaze_gmicloud/chat.py
 * Auth: GMI_API_KEY env var or api_key= option.
 */

import { ChatMessage, ChatResponse, ToolCall, parseToolCallArguments } from '../../../core/genblaze_core/models/chat.js';

const DEFAULT_BASE_URL = 'https://api.gmi-serving.com/v1';

function normalizeMessages(
    messages: Array<ChatMessage | Record<string, any>> | null,
    prompt: string | null,
    system: string | null
): Array<Record<string, any>> {
    if (messages == null && prompt == null) {
        throw new Error('chat() requires either `messages` or `prompt`');
    }

    const out: Array<Record<string, any>> = [];
    if (system != null) out.push({ role: 'system', content: system });

    if (messages != null) {
        for (const m of messages) {
            const role = (m as any).role as string;
            const content = (m as any).content;
            let wireContent: any = typeof content === 'string' ? content :
                (Array.isArray(content) ? content.map((b: any) => {
                    if (b.type === 'text') return { type: 'text', text: b.text };
                    if (b.type === 'image_url') return { type: 'image_url', image_url: b.imageUrl ?? b.image_url };
                    return b;
                }) : content);

            const wire: Record<string, any> = { role, content: wireContent };
            if ((m as any).name) wire.name = (m as any).name;
            if ((m as any).toolCallId) wire.tool_call_id = (m as any).toolCallId;
            out.push(wire);
        }
    } else {
        out.push({ role: 'user', content: prompt });
    }
    return out;
}

function parseGMIResponse(model: string, raw: Record<string, any>): ChatResponse {
    const choice = (raw.choices ?? [{}])[0] ?? {};
    const message = choice.message ?? {};
    const usage = raw.usage ?? {};

    const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name ?? '',
        arguments: parseToolCallArguments(tc.function?.arguments ?? '{}')
    }));

    return {
        text: message.content ?? '',
        model: raw.model ?? model,
        finishReason: choice.finish_reason ?? null,
        tokensIn: usage.prompt_tokens ?? null,
        tokensOut: usage.completion_tokens ?? null,
        tokensCached: null,
        toolCalls,
        costUsd: null,
        raw
    };
}

export interface GMICloudChatOptions {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    maxRetries?: number;
    timeoutMs?: number;
}

export class GMICloudChatClient {
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;
    private maxRetries: number;
    private timeoutMs: number;

    constructor(options: GMICloudChatOptions = {}) {
        this.apiKey = options.apiKey || process.env.GMI_API_KEY || '';
        this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
        this.defaultModel = options.defaultModel || 'meta-llama/llama-4-scout-17b-16e-instruct';
        this.maxRetries = options.maxRetries ?? 2;
        this.timeoutMs = options.timeoutMs ?? 60_000;
    }

    async chat(options: {
        messages?: Array<ChatMessage | Record<string, any>>;
        prompt?: string;
        system?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        [key: string]: any;
    }): Promise<ChatResponse> {
        if (!this.apiKey) {
            throw new Error('GMI_API_KEY is required for GMICloudChatClient');
        }

        const { messages, prompt, system, model, temperature, maxTokens } = options;
        const wireMessages = normalizeMessages(messages ?? null, prompt ?? null, system ?? null);
        const resolvedModel = model ?? this.defaultModel;

        const body: Record<string, any> = { model: resolvedModel, messages: wireMessages };
        if (temperature != null) body.temperature = temperature;
        if (maxTokens != null) body.max_tokens = maxTokens;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const res = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (res.ok) return parseGMIResponse(resolvedModel, await res.json());

                const errText = await res.text();
                if (res.status === 429 && attempt < this.maxRetries) {
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
                throw new Error(`GMICloud chat failed (${res.status}): ${errText}`);
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') throw new Error('GMICloud chat request timed out');
                if (attempt === this.maxRetries) throw err;
            }
        }
        throw new Error('GMICloud chat failed after all retries');
    }
}

/** Functional wrapper */
export async function gmiChat(
    options: Parameters<GMICloudChatClient['chat']>[0] & GMICloudChatOptions
): Promise<ChatResponse> {
    const { apiKey, baseUrl, defaultModel, maxRetries, timeoutMs, ...chatOptions } = options;
    const client = new GMICloudChatClient({ apiKey, baseUrl, defaultModel, maxRetries, timeoutMs });
    return client.chat(chatOptions);
}
