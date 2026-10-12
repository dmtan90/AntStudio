import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Organization } from '../models/Organization.js';

/**
 * Whether a user may access a project: owner, listed collaborator, or member of the project's organization.
 * Returns null when the project does not exist (callers decide how to treat unknown IDs).
 */
export async function userCanAccessProject(userId: string, projectId: string): Promise<boolean | null> {
    if (!userId || !mongoose.isValidObjectId(projectId)) return null;

    const project = await Project.findById(projectId).select('userId organizationId collaborators').lean();
    if (!project) return null;

    if (String(project.userId) === userId) return true;
    if (project.collaborators?.some((c: any) => String(c.userId) === userId)) return true;
    if (project.organizationId) {
        const isMember = await Organization.exists({ _id: project.organizationId, 'members.userId': userId });
        if (isMember) return true;
    }
    return false;
}
