/**
 * Standalone NVIDIA NIM chat wrapper (integrate.api.nvidia.com/v1).
 * 1:1 port of connectors/nvidia/genblaze_nvidia/chat.py
 *
 * NIM's chat surface is OpenAI-wire-compatible.
 * Model ids are free-form; nothing is hardcoded.
 */

import { ChatMessage, ChatResponse, ToolCall, parseToolCallArguments } from '../../../core/genblaze_core/models/chat.js';

const DEFAULT_CHAT_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function resolveChatBaseUrl(explicit?: string | null): string {
    return explicit || process.env.NVIDIA_CHAT_BASE_URL || DEFAULT_CHAT_BASE_URL;
}

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

            let wireContent: any;
            if (typeof content === 'string') {
                wireContent = content;
            } else if (Array.isArray(content)) {
                wireContent = content.map((b: any) => {
                    if (b.type === 'text') return { type: 'text', text: b.text };
                    if (b.type === 'image_url') return { type: 'image_url', image_url: b.imageUrl ?? b.image_url };
                    if (b.type === 'video_url') return { type: 'video_url', video_url: b.videoUrl ?? b.video_url };
                    return b;
                });
            } else {
                wireContent = content;
            }

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

function parseNIMResponse(model: string, raw: Record<string, any>): ChatResponse {
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

export interface NvidiaChatOptions {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    maxRetries?: number;
    timeoutMs?: number;
}

export class NvidiaChatClient {
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;
    private maxRetries: number;
    private timeoutMs: number;

    constructor(options: NvidiaChatOptions = {}) {
        this.apiKey = options.apiKey || process.env.NVIDIA_API_KEY || '';
        this.baseUrl = resolveChatBaseUrl(options.baseUrl);
        this.defaultModel = options.defaultModel || 'meta/llama-3.3-70b-instruct';
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
        tools?: any[];
        [key: string]: any;
    }): Promise<ChatResponse> {
        if (!this.apiKey) {
            throw new Error('NVIDIA_API_KEY is required for NvidiaChatClient');
        }

        const { messages, prompt, system, model, temperature, maxTokens, tools } = options;
        const wireMessages = normalizeMessages(messages ?? null, prompt ?? null, system ?? null);

        const body: Record<string, any> = {
            model: model ?? this.defaultModel,
            messages: wireMessages
        };
        if (temperature != null) body.temperature = temperature;
        if (maxTokens != null) body.max_tokens = maxTokens;
        if (tools?.length) body.tools = tools;

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

                if (res.ok) {
                    return parseNIMResponse(body.model, await res.json());
                }

                const errText = await res.text();
                if (res.status === 429 && attempt < this.maxRetries) {
                    const retryAfter = Number(res.headers.get('retry-after') ?? '5');
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }
                throw new Error(`NVIDIA NIM chat failed (${res.status}): ${errText}`);
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') throw new Error('NVIDIA NIM chat request timed out');
                if (attempt === this.maxRetries) throw err;
            }
        }

        throw new Error('NVIDIA NIM chat failed after all retries');
    }
}

/** Functional wrapper — convenience for one-off calls. */
export async function nvidiaChat(
    options: Parameters<NvidiaChatClient['chat']>[0] & NvidiaChatOptions
): Promise<ChatResponse> {
    const { apiKey, baseUrl, defaultModel, maxRetries, timeoutMs, ...chatOptions } = options;
    const client = new NvidiaChatClient({ apiKey, baseUrl, defaultModel, maxRetries, timeoutMs });
    return client.chat(chatOptions);
}
