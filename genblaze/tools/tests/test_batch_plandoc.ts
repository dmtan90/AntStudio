/**
 * Test for batch_plandoc.ts
 * 1:1 port of tools/tests/test_batch_plandoc.py
 */

import { computePlanToken, embedMeta, extractMeta } from '../batch_plandoc.js';

describe('batch_plandoc', () => {
    test('token computation and embedding', () => {
        const token = computePlanToken('abc1234', [{ issues: [10], defer_reason: '' }]);
        expect(token).toBeDefined();

        const meta = { base_sha: 'abc1234', token, plan: {} };
        const markdown = '# Plan Doc\n\nSome text';
        const embedded = embedMeta(markdown, meta);

        const extracted = extractMeta(embedded);
        expect(extracted).not.toBeNull();
        expect(extracted?.base_sha).toBe('abc1234');
        expect(extracted?.token).toBe(token);
    });
});
