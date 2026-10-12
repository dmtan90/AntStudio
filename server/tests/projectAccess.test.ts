import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ projectFindById: vi.fn(), orgExists: vi.fn() }));

vi.mock('../src/models/Project.js', () => ({ Project: { findById: mocks.projectFindById } }));
vi.mock('../src/models/Organization.js', () => ({ Organization: { exists: mocks.orgExists } }));

const { userCanAccessProject } = await import('../src/utils/projectAccess.js');

const PROJECT_ID = '64b7f0f0f0f0f0f0f0f0f0f0';
const mockProject = (project: any) => {
    mocks.projectFindById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(project) }) });
};

beforeEach(() => {
    mocks.projectFindById.mockReset();
    mocks.orgExists.mockReset();
});

describe('userCanAccessProject', () => {
    it('returns null for non-ObjectId room names without querying', async () => {
        await expect(userCanAccessProject('u1', 'studio_global')).resolves.toBeNull();
        expect(mocks.projectFindById).not.toHaveBeenCalled();
    });

    it('returns null when the project does not exist', async () => {
        mockProject(null);
        await expect(userCanAccessProject('u1', PROJECT_ID)).resolves.toBeNull();
    });

    it('allows the owner', async () => {
        mockProject({ userId: 'u1' });
        await expect(userCanAccessProject('u1', PROJECT_ID)).resolves.toBe(true);
    });

    it('allows listed collaborators', async () => {
        mockProject({ userId: 'owner', collaborators: [{ userId: 'u2' }] });
        await expect(userCanAccessProject('u2', PROJECT_ID)).resolves.toBe(true);
    });

    it('allows members of the owning organization', async () => {
        mockProject({ userId: 'owner', organizationId: 'org1' });
        mocks.orgExists.mockResolvedValue({ _id: 'org1' });
        await expect(userCanAccessProject('u3', PROJECT_ID)).resolves.toBe(true);
        expect(mocks.orgExists).toHaveBeenCalledWith({ _id: 'org1', 'members.userId': 'u3' });
    });

    it('denies everyone else', async () => {
        mockProject({ userId: 'owner', organizationId: 'org1', collaborators: [] });
        mocks.orgExists.mockResolvedValue(null);
        await expect(userCanAccessProject('stranger', PROJECT_ID)).resolves.toBe(false);
    });
});
