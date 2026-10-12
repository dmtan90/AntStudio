import { describe, expect, it } from 'vitest';
import { assertPublicHttpUrl, isBlockedAddress } from '../src/utils/ssrfGuard.js';

describe('isBlockedAddress', () => {
    it.each([
        '127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
        '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
        '::1', '::', 'fc00::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1'
    ])('blocks non-public address %s', (ip) => {
        expect(isBlockedAddress(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'])('allows public address %s', (ip) => {
        expect(isBlockedAddress(ip)).toBe(false);
    });

    it('treats non-IP input as blocked', () => {
        expect(isBlockedAddress('not-an-ip')).toBe(true);
    });
});

describe('assertPublicHttpUrl', () => {
    it.each([
        ['file:///etc/passwd', 'Invalid URL protocol'],
        ['gopher://example.com', 'Invalid URL protocol'],
        ['not a url', 'Invalid URL'],
        ['http://user:pass@8.8.8.8/', 'Credentials in URL are not allowed'],
        ['http://169.254.169.254/latest/meta-data', 'URL host is not allowed'],
        ['http://127.0.0.1:4000/api', 'URL host is not allowed'],
        ['http://[::1]/', 'URL host is not allowed'],
        ['http://localhost/', 'URL host is not allowed'],
        ['http://metadata.google.internal/', 'URL host is not allowed']
    ])('rejects %s', async (url, message) => {
        await expect(assertPublicHttpUrl(url)).rejects.toThrow(message);
    });

    it('accepts a public IP literal without DNS', async () => {
        const parsed = await assertPublicHttpUrl('https://8.8.8.8/image.png');
        expect(parsed.hostname).toBe('8.8.8.8');
    });
});
