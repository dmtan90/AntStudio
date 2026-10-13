import { describe, expect, it } from 'vitest';
import { escapeRegExp } from '../src/utils/escapeRegExp.js';

describe('escapeRegExp', () => {
    it('matches user input literally', () => {
        const pattern = new RegExp(escapeRegExp('a.b*(c)?[d]/e-f'), 'i');
        expect(pattern.test('A.B*(C)?[D]/E-F')).toBe(true);
        expect(pattern.test('axbbbc')).toBe(false);
    });

    it('defuses catastrophic backtracking patterns', () => {
        const pattern = new RegExp(escapeRegExp('(a+)+$'));
        const started = Date.now();
        expect(pattern.test('a'.repeat(5000) + '!')).toBe(false);
        expect(Date.now() - started).toBeLessThan(100);
    });

    it('stringifies non-string query values', () => {
        expect(escapeRegExp(['x', 'y'])).toBe('x,y');
        expect(escapeRegExp(undefined)).toBe('');
    });
});
