/**
 * Test for Genblaze CLI commands.
 * 1:1 port of cli/tests/test_cli.py
 */

import { runVerifyCommand } from '../genblaze_cli/commands/verify.js';
import { runExtractCommand } from '../genblaze_cli/commands/extract.js';

describe('Genblaze CLI', () => {
    test('verify command exported', () => {
        expect(runVerifyCommand).toBeDefined();
    });

    test('extract command exported', () => {
        expect(runExtractCommand).toBeDefined();
    });
});
