/**
 * Standalone OpenAI Chat Completions wrapper.
 * 1:1 port of connectors/openai/genblaze_openai/chat.py
 */

import { ChatMessage, ChatResponse, ToolCall, parseToolCallArguments } from '../../../core/genblaze_core/models/chat.js';

function normalizeMessages(
    messages: Array<ChatMessage | Record<string, any>> | null,
    prompt: string | null,
    system: string | null
): Array<Record<string, any>> {
    if (messages == null && prompt == null) {
        throw new Error('chat() requires either `messages` or `prompt`');
    }

    const out: Array<Record<string, any>> = [];

    if (system != null) {
        out.push({ role: 'system', content: system });
    }

    if (messages != null) {
        for (const m of messages) {
            if ('role' in m && typeof (m as any).role === 'string' && 'content' in m) {
                const msg = m as ChatMessage;
                let wireContent: any;
                if (typeof msg.content === 'string') {
                    wireContent = msg.content;
                } else {
                    wireContent = (msg.content as any[]).map(b => {
                        const type = (b as any).type;
                        if (type === 'text') return { type: 'text', text: (b as any).text };
                        if (type === 'image_url') return { type: 'image_url', image_url: (b as any).imageUrl };
                        return b;
                    });
                }
                const wire: Record<string, any> = { role: msg.role, content: wireContent };
                if (msg.name != null) wire.name = msg.name;
                if (msg.toolCallId != null) wire.tool_call_id = msg.toolCallId;
                if (msg.toolCalls?.length) {
                    wire.tool_calls = msg.toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
                    }));
                }
                out.push(wire);
            } else {
                out.push({ ...m });
            }
        }
    } else {
        out.push({ role: 'user', content: prompt });
    }

    return out;
}

function parseOpenAIResponse(model: string, raw: Record<string, any>): ChatResponse {
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
        tokensCached: usage.prompt_tokens_details?.cached_tokens ?? null,
        toolCalls,
        costUsd: null,
        raw
    };
}

export interface OpenAIChatOptions {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    maxRetries?: number;
    timeoutMs?: number;
}

export class OpenAIChatClient {
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;
    private maxRetries: number;
    private timeoutMs: number;

    constructor(options: OpenAIChatOptions = {}) {
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
        this.defaultModel = options.defaultModel || 'gpt-4o';
        this.maxRetries = options.maxRetries ?? 2;
        this.timeoutMs = options.timeoutMs ?? 30_000;
    }

    async chat(options: {
        messages?: Array<ChatMessage | Record<string, any>>;
        prompt?: string;
        system?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        tools?: any[];
        responseFormat?: Record<string, any>;
        [key: string]: any;
    }): Promise<ChatResponse> {
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is required for OpenAIChatClient');
        }

        const { messages, prompt, system, model, temperature, maxTokens, tools, responseFormat, ...rest } = options;
        const wireMessages = normalizeMessages(messages ?? null, prompt ?? null, system ?? null);

        const body: Record<string, any> = {
            model: model ?? this.defaultModel,
            messages: wireMessages
        };
        if (temperature != null) body.temperature = temperature;
        if (maxTokens != null) body.max_tokens = maxTokens;
        if (tools?.length) body.tools = tools;
        if (responseFormat) body.response_format = responseFormat;

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
                    const raw = await res.json();
                    return parseOpenAIResponse(body.model, raw);
                }

                const errText = await res.text();
                if (res.status === 429 && attempt < this.maxRetries) {
                    const retryAfter = Number(res.headers.get('retry-after') ?? '5');
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }
                throw new Error(`OpenAI chat failed (${res.status}): ${errText}`);
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') throw new Error('OpenAI chat request timed out');
                if (attempt === this.maxRetries) throw err;
            }
        }

        throw new Error('OpenAI chat failed after all retries');
    }
}

/** Functional wrapper — convenience for one-off calls. */
export async function openaiChat(
    options: Parameters<OpenAIChatClient['chat']>[0] & OpenAIChatOptions
): Promise<ChatResponse> {
    const { apiKey, baseUrl, defaultModel, maxRetries, timeoutMs, ...chatOptions } = options;
    const client = new OpenAIChatClient({ apiKey, baseUrl, defaultModel, maxRetries, timeoutMs });
    return client.chat(chatOptions);
}
