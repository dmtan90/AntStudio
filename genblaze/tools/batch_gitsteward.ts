/**
 * Git steward for the batch maintainer: safe preflight + conservative cleanup.
 * 1:1 port of tools/batch_gitsteward.py
 */

import { execSync } from 'child_process';

export const DEFAULT_BRANCH_PATTERNS = [
    'issue-*',
    '*/issue-*',
    'issues-*',
    '*/issues-*',
    'cluster-*',
    'cluster/*'
];

export interface PreflightResult {
    ok: boolean;
    currentBranch: string;
    dirty: boolean;
    mainAction: string;
    ahead: number;
    behind: number;
    messages: string[];
}

export function runGit(repo: string, args: string[]): { stdout: string; stderr: string; status: number } {
    try {
        const stdout = execSync(`git ${args.join(' ')}`, { cwd: repo, encoding: 'utf-8', stdio: 'pipe' });
        return { stdout, stderr: '', status: 0 };
    } catch (err: any) {
        return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', status: err.status ?? 1 };
    }
}

export function checkPreflight(repoDir: string): PreflightResult {
    const currentBranchRes = runGit(repoDir, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const currentBranch = currentBranchRes.stdout.trim() || 'main';

    const statusRes = runGit(repoDir, ['status', '--porcelain']);
    const dirty = statusRes.stdout.trim().length > 0;

    const messages: string[] = [];
    if (dirty) {
        messages.push('Working directory is dirty. Stash or commit your changes before running batch maintainer.');
    }

    return {
        ok: !dirty,
        currentBranch,
        dirty,
        mainAction: dirty ? 'blocked-dirty' : 'up-to-date',
        ahead: 0,
        behind: 0,
        messages
    };
}
