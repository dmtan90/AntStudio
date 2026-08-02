/**
 * Test for batch_cluster.ts
 * 1:1 port of tools/tests/test_batch_cluster.py
 */

import { clusterIssues, isHotFile, HOT_FILE_PATTERNS } from '../batch_cluster.js';

describe('batch_cluster', () => {
    test('hot file detection', () => {
        expect(isHotFile('CHANGELOG.md')).toBe(true);
        expect(isHotFile('README.md')).toBe(true);
        expect(isHotFile('pyproject.toml')).toBe(true);
        expect(isHotFile('package.json')).toBe(true);
        expect(isHotFile('libs/core/pipeline.ts')).toBe(false);
    });

    test('cluster basic issues', () => {
        const issues = [
            { number: 1, type: 'feature', touched_files: ['libs/core/x.ts'] },
            { number: 2, type: 'bug', touched_files: ['libs/core/y.ts'] }
        ];

        const plan = clusterIssues(issues);
        expect(plan.executable.length).toBe(2);
        expect(plan.deferred.length).toBe(0);
        expect(plan.skipped.length).toBe(0);
    });
});
