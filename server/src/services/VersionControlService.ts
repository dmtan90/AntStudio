import { Project } from '../models/Project.js';
import { ProjectVersion } from '../models/ProjectVersion.js';

export class VersionControlService {
    async createVersion(
        projectId: string,
        userId: string,
        message: string = 'Auto-save'
    ): Promise<number> {
        const project = await Project.findById(projectId);
        if (!project) throw new Error('Project not found');

        const latestVersion = await ProjectVersion.findOne({ projectId })
            .sort({ version: -1 });

        const newVersion = (latestVersion?.version || 0) + 1;

        const changes = latestVersion
            ? this.detectChanges(latestVersion.snapshot, project.toObject())
            : [];

        await ProjectVersion.create({
            projectId,
            version: newVersion,
            snapshot: project.toObject(),
            changes,
            createdBy: userId,
            message
        });

        return newVersion;
    }

    async getVersionHistory(projectId: string, limit: number = 20) {
        return ProjectVersion.find({ projectId })
            .sort({ version: -1 })
            .limit(limit)
            .populate('createdBy', 'name email avatar')
            .select('version message createdAt createdBy changes')
            .lean();
    }

    async getVersion(projectId: string, version: number) {
        return ProjectVersion.findOne({ projectId, version })
            .populate('createdBy', 'name email avatar')
            .lean();
    }

    async revertToVersion(projectId: string, version: number, userId: string) {
        const targetVersion = await ProjectVersion.findOne({ projectId, version });
        if (!targetVersion) throw new Error('Version not found');

        // Create a new version before reverting (for safety)
        await this.createVersion(projectId, userId, `Reverting to version ${version}`);

        // Apply the snapshot (exclude _id and timestamps)
        const { _id, createdAt, updatedAt, __v, ...snapshot } = targetVersion.snapshot;
        await Project.findByIdAndUpdate(projectId, snapshot);

        return targetVersion;
    }

    async compareVersions(projectId: string, version1: number, version2: number) {
        const [v1, v2] = await Promise.all([
            ProjectVersion.findOne({ projectId, version: version1 }),
            ProjectVersion.findOne({ projectId, version: version2 })
        ]);

        if (!v1 || !v2) throw new Error('Version not found');

        return this.detectChanges(v1.snapshot, v2.snapshot);
    }

    private detectChanges(oldState: any, newState: any): any[] {
        const changes: any[] = [];

        // Simple diff implementation (can be enhanced with deep-diff library)
        const compareObjects = (old: any, current: any, path: string = '') => {
            const allKeys = new Set([...Object.keys(old || {}), ...Object.keys(current || {})]);

            allKeys.forEach(key => {
                const fullPath = path ? `${path}.${key}` : key;
                const oldVal = old?.[key];
                const newVal = current?.[key];

                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    changes.push({
                        field: fullPath,
                        oldValue: oldVal,
                        newValue: newVal
                    });
                }
            });
        };

        compareObjects(oldState, newState);
        return changes;
    }
}

export const versionControlService = new VersionControlService();
