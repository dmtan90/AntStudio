import { Request } from 'express';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from './jwt.js';
import { User, UserRole } from '../models/User.js';
import { StreamSessionModel } from '../models/StreamSession.js';
import { userCanAccessProject } from './projectAccess.js';
import { Logger } from './Logger.js';

/**
 * Access control for stored files served through /api/s3/* and /uploads/*.
 *
 * Files are addressed by predictable keys (projects/<id>/..., media/<userId>/...), so they must not be
 * readable by anyone who can guess a key. Rules are per key prefix:
 *   projects/<projectId>/...           project owner, collaborator or org member
 *   users/<userId>/avatar.*, avatars/  public (avatars are shown to teammates, guests and viewers)
 *   users|media|influencer|thumbnails/<userId>/   that user
 *   highlights/<sessionId>/...         owner of the stream session
 *   anything else (temp, music, ...)   any signed-in user
 * Admins can read everything.
 *
 * Rollout is controlled by STORAGE_ACCESS_MODE:
 *   off      no checks (previous behaviour)
 *   report   serve every file, but log requests the rules would deny (default)
 *   enforce  deny them (401 when not signed in, 403 otherwise)
 */
export type StorageAccessMode = 'off' | 'report' | 'enforce';

export interface StorageUser {
    id: string;
    isAdmin: boolean;
}

export interface StorageDecision {
    allowed: boolean;
    /** Short machine-readable reason, used for logs and tests */
    reason: string;
    /** Whether the file may be cached by shared caches */
    isPublic: boolean;
}

export function getStorageAccessMode(): StorageAccessMode {
    const mode = (process.env.STORAGE_ACCESS_MODE || 'report').toLowerCase();
    return mode === 'off' || mode === 'enforce' ? mode : 'report';
}

/** Rejects keys that could escape their prefix or are malformed. Returns the normalized key or null. */
export function normalizeStorageKey(rawKey: string): string | null {
    let key: string;
    try {
        key = decodeURIComponent(rawKey);
    } catch {
        return null;
    }
    key = key.replace(/\\/g, '/');
    if (!key || key.startsWith('/') || key.split('/').some(seg => seg === '..' || seg === '.')) return null;
    return key;
}

/** Identifies the caller from a Bearer token or the auth cookie, without requiring one. */
export async function resolveStorageUser(req: Request): Promise<StorageUser | null> {
    const token = extractTokenFromHeader(req.headers.authorization) || extractTokenFromCookie(req.headers.cookie);
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded) return null;
    const user = await User.findById(decoded.userId).select('role isActive').lean();
    if (!user || user.isActive === false) return null;
    return { id: String(decoded.userId), isAdmin: user.role === UserRole.ADMIN || user.role === UserRole.SYS_ADMIN };
}

export async function checkStorageAccess(key: string, user: StorageUser | null): Promise<StorageDecision> {
    const [prefix, owner, ...rest] = key.split('/');
    const decision = (allowed: boolean, reason: string, isPublic = false): StorageDecision => ({ allowed, reason, isPublic });

    if (prefix === 'users' && owner && rest.length === 1 && /^avatar\.\w+$/.test(rest[0])) {
        return decision(true, 'public-avatar', true);
    }
    // Media-library uploads with purpose 'avatar' (avatars/<userId>/...)
    if (prefix === 'avatars' && owner && rest.length >= 1) {
        return decision(true, 'public-avatar', true);
    }
    if (!user) return decision(false, 'not-signed-in');
    if (user.isAdmin) return decision(true, 'admin');

    switch (prefix) {
        case 'projects': {
            const access = owner ? await userCanAccessProject(user.id, owner) : null;
            return access ? decision(true, 'project-member') : decision(false, access === null ? 'project-not-found' : 'not-project-member');
        }
        case 'users':
        case 'media':
        case 'influencer':
        case 'thumbnails':
            return owner === user.id ? decision(true, 'owner') : decision(false, 'not-owner');
        case 'highlights': {
            const session = owner ? await StreamSessionModel.findOne({ sessionId: owner }).select('userId').lean() : null;
            return session && String(session.userId) === user.id ? decision(true, 'session-owner') : decision(false, 'not-session-owner');
        }
        default:
            return decision(true, 'signed-in');
    }
}

// Report mode: log each (prefix, reason) once per 10 minutes so the log stays readable
const reported = new Map<string, number>();
const REPORT_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Applies the configured mode. Returns an HTTP status to send (401/403) or null to serve the file.
 */
export async function authorizeStorageRequest(req: Request, key: string, source: string): Promise<{ status: number | null; decision: StorageDecision | null }> {
    const mode = getStorageAccessMode();
    if (mode === 'off') return { status: null, decision: null };

    const user = await resolveStorageUser(req);
    const decision = await checkStorageAccess(key, user);
    if (decision.allowed) return { status: null, decision };

    if (mode === 'report') {
        const prefix = key.split('/')[0];
        const tag = `${source}:${prefix}:${decision.reason}`;
        const last = reported.get(tag) || 0;
        if (Date.now() - last > REPORT_INTERVAL_MS) {
            reported.set(tag, Date.now());
            Logger.warn(`[StorageAccess] Would deny ${source} read of "${prefix}/..." (${decision.reason}); serving because STORAGE_ACCESS_MODE=report`, 'StorageAccess');
        }
        return { status: null, decision };
    }
    return { status: user ? 403 : 401, decision };
}
