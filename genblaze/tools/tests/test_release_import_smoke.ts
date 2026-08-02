/**
 * Test for release_import_smoke.ts
 * 1:1 port of tools/tests/test_release_import_smoke.py
 */

import { smokeImportModule } from '../release_import_smoke.js';

describe('release_import_smoke', () => {
    test('smoke import core', () => {
        const res = smokeImportModule('genblaze');
        expect(res.success).toBe(true);
    });
});
