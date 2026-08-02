/**
 * Test for check_pypi_metadata.ts
 * 1:1 port of tools/tests/test_check_pypi_metadata.py
 */

import { checkPackageMetadata } from '../check_pypi_metadata.js';

describe('check_pypi_metadata', () => {
    test('missing file return invalid', () => {
        const result = checkPackageMetadata('missing.json');
        expect(result.valid).toBe(false);
    });
});
