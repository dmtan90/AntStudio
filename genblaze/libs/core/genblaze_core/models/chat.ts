/**
 * Shared chat-call models — used by chat() callables in connector packages.
 * 1:1 port of models/chat.py
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextContent {
    type: 'text';
    text: string;
}

export interface ImageURLRef {
    url: string;
    detail?: 'low' | 'high' | 'auto' | null;
    mediaType?: string | null;
}

export interface ImageURLContent {
    type: 'image_url';
    imageUrl: ImageURLRef;
}

export interface VideoURLRef {
    url: string;
    mediaType?: string | null;
}

export interface VideoURLContent {
    type: 'video_url';
    videoUrl: VideoURLRef;
}

export interface AudioURLRef {
    url: string;
    mediaType?: string | null;
}

export interface AudioURLContent {
    type: 'audio_url';
    audioUrl: AudioURLRef;
}

export type ContentBlock = TextContent | ImageURLContent | VideoURLContent | AudioURLContent;

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}

export function parseToolCallArguments(raw: any): Record<string, any> {
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { _raw: raw };
        } catch {
            return { _raw: raw };
        }
    }
    return raw ?? {};
}

export interface ChatMessage {
    role: ChatRole;
    content: string | ContentBlock[];
    name?: string | null;
    toolCallId?: string | null;
    toolCalls?: ToolCall[] | null;
}

export function getChatMessageContentBlocks(msg: ChatMessage): ContentBlock[] {
    if (typeof msg.content === 'string') {
        return msg.content ? [{ type: 'text', text: msg.content }] : [];
    }
    return msg.content;
}

export interface ChatResponse {
    text: string;
    model: string;
    finishReason?: string | null;
    tokensIn?: number | null;
    tokensOut?: number | null;
    tokensCached?: number | null;
    toolCalls: ToolCall[];
    costUsd?: number | null;
    raw: Record<string, any>;
}
