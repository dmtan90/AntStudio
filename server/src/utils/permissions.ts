export enum Permission {
    // Organization Management
    ORG_VIEW = 'ORG_VIEW',
    ORG_MANAGE = 'ORG_MANAGE',     // Branding, Settings
    ORG_INVITE = 'ORG_INVITE',     // Recruit Specialists
    ORG_REMOVE_MEMBER = 'ORG_REMOVE_MEMBER',

    // Project Operations
    PROJECT_CREATE = 'PROJECT_CREATE',
    PROJECT_EDIT = 'PROJECT_EDIT',
    PROJECT_DELETE = 'PROJECT_DELETE',
    PROJECT_PUBLISH = 'PROJECT_PUBLISH',

    // AI & Creative Operations
    AI_TUNE = 'AI_TUNE',           // LoRA, Personalities
    AI_GENERATE = 'AI_GENERATE',   // Image/Video Gen

    // Streaming Operations
    STREAM_START = 'STREAM_START',
    STREAM_STOP = 'STREAM_STOP',
    STREAM_MANAGE_GUESTS = 'STREAM_MANAGE_GUESTS'
}

export type OrgRole = 'owner' | 'producer' | 'editor' | 'synthesizer';

const ROLES_PERMISSIONS: Record<OrgRole, Permission[]> = {
    owner: Object.values(Permission), // Owners have absolute tactical control

    producer: [
        Permission.ORG_VIEW,
        Permission.PROJECT_CREATE,
        Permission.PROJECT_EDIT,
        Permission.PROJECT_PUBLISH,
        Permission.AI_TUNE,
        Permission.AI_GENERATE,
        Permission.STREAM_START,
        Permission.STREAM_STOP,
        Permission.STREAM_MANAGE_GUESTS
    ],

    editor: [
        Permission.ORG_VIEW,
        Permission.PROJECT_EDIT,
        Permission.AI_GENERATE
    ],

    synthesizer: [
        Permission.ORG_VIEW,
        Permission.AI_TUNE,
        Permission.AI_GENERATE
    ]
};

/**
 * Check if a role has a specific permission.
 */
export const hasPermission = (role: OrgRole, permission: Permission): boolean => {
    return ROLES_PERMISSIONS[role]?.includes(permission) || false;
};
