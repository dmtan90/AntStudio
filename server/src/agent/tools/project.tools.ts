/**
 * Project & Video Generation Tools
 * Maps to: /api/projects endpoints
 */

import { apiCall, setAuthToken } from './product.tools.js';

let _authToken: string = '';
export function setProjectAuthToken(token: string) { _authToken = token; }
function call(method: string, path: string, body?: any) {
    return apiCall(method, path, body, _authToken);
}

// Active project state tracking for context-aware UI updates
let lastActiveProject: any = null;

export function getLastActiveProject() {
    return lastActiveProject;
}

export function clearLastActiveProject() {
    lastActiveProject = null;
}

// ─── Project Tools ───────────────────────────────────────────

/**
 * List all projects for the current user
 */
export async function listProjects({
    status,
    search,
    page = 1,
    limit = 20,
}: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
} = {}): Promise<any> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return call('GET', `/api/projects?${params.toString()}`);
}

/**
 * Get a single project by ID
 */
export async function getProject({ projectId }: { projectId: string }): Promise<any> {
    const res = await call('GET', `/api/projects/${projectId}`);
    if (res && res.success && res.data) {
        lastActiveProject = res.data;
    }
    return res;
}

/**
 * Create a new project
 */
export async function createProject({
    title,
    description,
    mode = 'topic',
    videoStyle = 'Cinematic',
    targetDuration = 60,
    aspectRatio = '16:9',
}: {
    title: string;
    description?: string;
    mode?: 'topic' | 'script' | 'live';
    videoStyle?: string;
    targetDuration?: number;
    aspectRatio?: string;
}): Promise<any> {
    const res = await call('POST', '/api/projects', {
        title, description, mode, videoStyle, targetDuration, aspectRatio
    });
    if (res && res.success && res.data) {
        lastActiveProject = res.data;
    }
    return res;
}

/**
 * Delete a project
 */
export async function deleteProject({ projectId }: { projectId: string }): Promise<any> {
    return call('DELETE', `/api/projects/${projectId}`);
}

/**
 * Generate a script for a project from a topic (Stage 1 of video creation)
 * ⚠️ Costs credits
 */
export async function generateScript({
    topic,
    videoStyle = 'Cinematic',
    targetDuration = 60,
    language = 'Vietnamese',
}: {
    topic: string;
    videoStyle?: string;
    targetDuration?: number;
    language?: string;
}): Promise<any> {
    const res = await call('POST', '/api/projects/preview', {
        topic, videoStyle, targetDuration, language, stage: 'script'
    });
    if (res && res.success && res.data) {
        lastActiveProject = res.data;
    }
    return res;
}

/**
 * Analyze a project's script → extract characters, visual style, audio direction
 * ⚠️ Costs credits
 */
export async function analyzeProjectScript({
    projectId,
}: {
    projectId: string;
}): Promise<any> {
    const res = await call('POST', `/api/projects/${projectId}/analyze`);
    if (res && res.success && res.data) {
        lastActiveProject = res.data;
    }
    return res;
}

/**
 * Generate storyboard for a project (requires analysis to be done first)
 * ⚠️ Costs credits
 */
export async function generateStoryboard({
    projectId,
}: {
    projectId: string;
}): Promise<any> {
    const res = await call('POST', `/api/projects/${projectId}/generate-storyboard`);
    if (res && res.success && res.data) {
        lastActiveProject = res.data;
    }
    return res;
}

/**
 * Convert a project's storyboard into a live broadcast script
 */
export async function convertToLiveScript({
    projectId,
}: {
    projectId: string;
}): Promise<any> {
    return call('POST', `/api/projects/${projectId}/convert-to-script`);
}

/**
 * Full video creation preview (topic → script → analysis → storyboard in one call)
 * ⚠️ Costs credits
 */
export async function createVideoPreview({
    topic,
    videoStyle = 'Cinematic',
    targetDuration = 60,
    language = 'Vietnamese',
}: {
    topic: string;
    videoStyle?: string;
    targetDuration?: number;
    language?: string;
}): Promise<any> {
    const res = await call('POST', '/api/projects/preview', {
        topic, videoStyle, targetDuration, language
    });
    if (res && res.success && res.data) {
        lastActiveProject = res.data;
    }
    return res;
}

/**
 * Chat with AI about a project (refine script, get suggestions)
 */
export async function chatAboutProject({
    projectId,
    message,
}: {
    projectId: string;
    message: string;
}): Promise<any> {
    return call('POST', `/api/projects/${projectId}/chat`, { message });
}
