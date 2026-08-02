/**
 * Standalone Google Gemini chat wrapper. 1:1 port of connectors/google/genblaze_google/chat.py
 * Same signature as OpenAI chat, same ChatResponse shape. Auth: GEMINI_API_KEY.
 */

import { ChatMessage, ChatResponse, ToolCall, parseToolCallArguments } from '../../../core/genblaze_core/models/chat.js';

// Gemini uses "model" / "user" roles; "assistant" maps to "model".
const ROLE_MAP: Record<string, string> = {
    user: 'user',
    assistant: 'model',
    system: 'user',
    tool: 'user'
};

function geminiTextOnly(content: string | any[]): string {
    if (typeof content === 'string') return content;
    return content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
}

function contentToGeminiParts(content: string | any[]): Array<Record<string, any>> {
    if (typeof content === 'string') {
        return [{ text: content }];
    }
    return (content as any[]).map(block => {
        if (block.type === 'text') return { text: block.text };
        if (block.type === 'image_url') {
            const url = block.imageUrl?.url ?? block.image_url?.url ?? '';
            if (url.startsWith('data:')) {
                const [header, b64] = url.split(',', 2);
                const mimeType = header.replace('data:', '').replace(';base64', '');
                return { inlineData: { mimeType, data: b64 } };
            }
            return { fileData: { fileUri: url, mimeType: block.imageUrl?.mediaType ?? 'image/jpeg' } };
        }
        return { text: JSON.stringify(block) };
    });
}

function normalizeToGemini(
    messages: Array<ChatMessage | Record<string, any>> | null,
    prompt: string | null,
    system: string | null
): { contents: Array<Record<string, any>>; systemInstruction: string | null } {
    if (messages == null && prompt == null) {
        throw new Error('chat() requires either `messages` or `prompt`');
    }

    let systemInstruction = system;
    const contents: Array<Record<string, any>> = [];
    const msgs: Array<ChatMessage | Record<string, any>> = messages ?? [];

    const allMsgs = msgs.length > 0 ? msgs : [{ role: 'user', content: prompt ?? '' }];

    for (const m of allMsgs) {
        const role = (m as any).role as string;
        const content = (m as any).content;
        if (role === 'system') {
            if (systemInstruction == null) {
                systemInstruction = typeof content === 'string' ? content : geminiTextOnly(content);
            }
            continue;
        }
        contents.push({
            role: ROLE_MAP[role] ?? 'user',
            parts: contentToGeminiParts(content)
        });
    }

    return { contents, systemInstruction };
}

function parseGeminiResponse(model: string, raw: Record<string, any>): ChatResponse {
    const candidate = (raw.candidates ?? [])[0] ?? {};
    const content = candidate.content ?? {};
    const parts = content.parts ?? [];

    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
        if (part.text) {
            text += part.text;
        } else if (part.functionCall) {
            toolCalls.push({
                id: `${part.functionCall.name}-${Date.now()}`,
                name: part.functionCall.name,
                arguments: part.functionCall.args ?? {}
            });
        }
    }

    const usage = raw.usageMetadata ?? {};
    return {
        text,
        model: raw.modelVersion ?? model,
        finishReason: candidate.finishReason ?? null,
        tokensIn: usage.promptTokenCount ?? null,
        tokensOut: usage.candidatesTokenCount ?? null,
        tokensCached: usage.cachedContentTokenCount ?? null,
        toolCalls,
        costUsd: null,
        raw
    };
}

export interface GoogleChatOptions {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    maxRetries?: number;
    timeoutMs?: number;
}

export class GoogleChatClient {
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;
    private maxRetries: number;
    private timeoutMs: number;

    constructor(options: GoogleChatOptions = {}) {
        this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
        this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        this.defaultModel = options.defaultModel || 'gemini-2.0-flash-001';
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
            throw new Error('GEMINI_API_KEY is required for GoogleChatClient');
        }

        const { messages, prompt, system, model, temperature, maxTokens, tools } = options;
        const resolvedModel = model ?? this.defaultModel;
        const { contents, systemInstruction } = normalizeToGemini(
            messages ?? null, prompt ?? null, system ?? null
        );

        const body: Record<string, any> = { contents };
        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }
        if (temperature != null || maxTokens != null) {
            body.generationConfig = {};
            if (temperature != null) body.generationConfig.temperature = temperature;
            if (maxTokens != null) body.generationConfig.maxOutputTokens = maxTokens;
        }
        if (tools?.length) {
            body.tools = [{ functionDeclarations: tools }];
        }

        const url = `${this.baseUrl}/models/${resolvedModel}:generateContent?key=${this.apiKey}`;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const raw = await res.json();
                    return parseGeminiResponse(resolvedModel, raw);
                }

                const errText = await res.text();
                if (res.status === 429 && attempt < this.maxRetries) {
                    const retryAfter = Number(res.headers.get('retry-after') ?? '5');
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }
                throw new Error(`Gemini chat failed (${res.status}): ${errText}`);
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') throw new Error('Gemini chat request timed out');
                if (attempt === this.maxRetries) throw err;
            }
        }

        throw new Error('Gemini chat failed after all retries');
    }
}

/** Functional wrapper — convenience for one-off calls. */
export async function googleChat(
    options: Parameters<GoogleChatClient['chat']>[0] & GoogleChatOptions
): Promise<ChatResponse> {
    const { apiKey, baseUrl, defaultModel, maxRetries, timeoutMs, ...chatOptions } = options;
    const client = new GoogleChatClient({ apiKey, baseUrl, defaultModel, maxRetries, timeoutMs });
    return client.chat(chatOptions);
}
