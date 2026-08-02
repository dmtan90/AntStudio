/**
 * Test for check_pin_parity.ts
 * 1:1 port of tools/tests/test_check_pin_parity.py
 */

import { checkPackageParity } from '../check_pin_parity.js';

describe('check_pin_parity', () => {
    test('non-existent package check', () => {
        const result = checkPackageParity('non_existent.json');
        expect(result.hasDrift).toBe(false);
    });
});
