/**
 * UUID Generation Utilities
 * Provides UUID v4 generation for unique guest identification
 */

/**
 * Generate a UUID v4
 * Uses the native crypto.randomUUID() API
 */
export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Check if a string is a valid UUID
 */
export function isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Generate a deterministic UUID from a string
 * Used for migrating legacy IDs to UUID format
 * Note: This is NOT cryptographically secure, only for backward compatibility
 */
export function generateDeterministicUUID(input: string): string {
    // Simple hash function to convert string to UUID format
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert hash to UUID format
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(0, 3)}-${(parseInt(hex[0], 16) & 0x3 | 0x8).toString(16)}${hex.slice(1, 3)}-${hex.slice(0, 12)}`;
}

/**
 * Migrate legacy ID to UUID format
 * For backward compatibility with existing sessions
 */
export function migrateToUUID(legacyId: string): string {
    // If already a UUID, return as-is
    if (isUUID(legacyId)) return legacyId;
    
    // Generate deterministic UUID from legacy ID
    return generateDeterministicUUID(legacyId);
}
