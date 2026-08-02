/**
 * Test for meta umbrella shim.
 * 1:1 port of libs/meta/tests/test_shim.py
 */

import * as genblaze from '../genblaze/index.js';

describe('genblaze umbrella shim', () => {
    test('re-exports core primitives', () => {
        expect(genblaze.Pipeline).toBeDefined();
        expect(genblaze.Modality).toBeDefined();
        expect(genblaze.ManifestBuilder).toBeDefined();
    });
});
