/**
 * Test for prepare_release.ts
 * 1:1 port of tools/tests/test_prepare_release.py
 */

import { prepareRelease } from '../prepare_release.js';

describe('prepare_release', () => {
    test('default prepare release check', () => {
        const result = prepareRelease(process.cwd());
        expect(result.upToDate).toBe(true);
    });
});
