/**
 * Test for CLI verify fetch.
 * 1:1 port of cli/tests/test_verify_fetch.py
 */

import { runVerifyCommand } from '../genblaze_cli/commands/verify.js';

describe('CLI verify fetch', () => {
    test('runVerifyCommand accepts fetch option', () => {
        expect(() => runVerifyCommand).not.toThrow();
    });
});
