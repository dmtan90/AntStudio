/**
 * Escapes user input for use inside a regular expression (MongoDB $regex or RegExp), so search
 * text is matched literally: no ReDoS patterns, no "match everything" wildcards. Non-string query
 * values (arrays/objects from ?q[]=...) are turned into plain strings first.
 */
export function escapeRegExp(value: unknown): string {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}
