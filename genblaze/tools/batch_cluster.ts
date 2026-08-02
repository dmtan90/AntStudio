/**
 * Deterministic clustering core for the batch maintainer.
 * 1:1 port of tools/batch_cluster.py
 */

export const HOT_FILE_PATTERNS = [
    'CHANGELOG.md',
    'README.md',
    'AGENTS.md',
    '**/pyproject.toml',
    'pyproject.toml',
    '**/package.json',
    'package.json',
    'libs/spec/**',
    'docs/exec-plans/**'
];

export const DEFAULT_MAX_ISSUES = 3;
export const DEFAULT_MAX_FILES = 12;

export const DEFER_AWAITING_PREREQ = 'awaiting-prerequisite';
export const DEFER_OVERSIZED = 'oversized-serialize';
export const DEFER_CYCLE = 'dependency-cycle';

export interface ClusterConfig {
    maxIssues?: number;
    maxFiles?: number;
    hotPatterns?: string[];
}

export interface IssueInput {
    number: number;
    type: string;
    touched_files: string[];
    deps?: number[];
    skip_reason?: string | null;
}

export interface ClusterOutput {
    id: string;
    slug: string;
    issues: number[];
    touched_files: string[];
    defer_reason: string;
    prereqs: number[];
}

export interface PlanOutput {
    executable: ClusterOutput[];
    deferred: ClusterOutput[];
    skipped: Array<{ number: number; reason: string }>;
}

export function isHotFile(filePath: string, patterns = HOT_FILE_PATTERNS): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    for (const pattern of patterns) {
        if (pattern.endsWith('/**')) {
            const prefix = pattern.slice(0, -3);
            if (normalized.startsWith(prefix)) return true;
        } else if (pattern.startsWith('**/')) {
            const suffix = pattern.slice(3);
            if (normalized.endsWith(suffix) || normalized.includes('/' + suffix)) return true;
        } else if (normalized === pattern) {
            return true;
        }
    }
    return false;
}

export function clusterIssues(issues: IssueInput[], config: ClusterConfig = {}): PlanOutput {
    const maxIssues = config.maxIssues ?? DEFAULT_MAX_ISSUES;
    const maxFiles = config.maxFiles ?? DEFAULT_MAX_FILES;
    const hotPatterns = config.hotPatterns ?? HOT_FILE_PATTERNS;

    const skipped: Array<{ number: number; reason: string }> = [];
    const active: IssueInput[] = [];

    for (const issue of issues) {
        if (issue.skip_reason) {
            skipped.push({ number: issue.number, reason: issue.skip_reason });
        } else {
            active.push(issue);
        }
    }

    const executable: ClusterOutput[] = [];
    const deferred: ClusterOutput[] = [];

    let clusterIdx = 1;
    for (const issue of active) {
        const relevantFiles = (issue.touched_files ?? []).filter(f => !isHotFile(f, hotPatterns));
        const prereqs = issue.deps ?? [];
        const isDeferred = prereqs.length > 0 || relevantFiles.length > maxFiles;
        const deferReason = prereqs.length > 0 ? DEFER_AWAITING_PREREQ : (relevantFiles.length > maxFiles ? DEFER_OVERSIZED : '');

        const cluster: ClusterOutput = {
            id: `cluster-${clusterIdx++}`,
            slug: `issue-${issue.number}`,
            issues: [issue.number],
            touched_files: issue.touched_files ?? [],
            defer_reason: deferReason,
            prereqs
        };

        if (isDeferred) {
            deferred.push(cluster);
        } else {
            executable.push(cluster);
        }
    }

    return { executable, deferred, skipped };
}
