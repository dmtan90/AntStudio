/**
 * Test for batch_gitsteward.ts
 * 1:1 port of tools/tests/test_batch_gitsteward.py
 */

import { DEFAULT_BRANCH_PATTERNS } from '../batch_gitsteward.js';

describe('batch_gitsteward', () => {
    test('default branch patterns', () => {
        expect(DEFAULT_BRANCH_PATTERNS).toContain('issue-*');
        expect(DEFAULT_BRANCH_PATTERNS).toContain('cluster-*');
    });
});
