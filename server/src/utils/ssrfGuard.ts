import net from 'net';
import dns from 'dns';
import http from 'http';
import https from 'https';

/**
 * SSRF protection for server-side fetches of user-supplied URLs.
 * Blocks loopback, private, link-local (cloud metadata), CGNAT, multicast and reserved ranges,
 * for both the initial host and every DNS resolution (redirects / DNS rebinding go through the agents).
 */
const blockList = new net.BlockList();
[
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
    ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]
].forEach(([ip, prefix]) => blockList.addSubnet(ip as string, prefix as number, 'ipv4'));
[
    ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96]
].forEach(([ip, prefix]) => blockList.addSubnet(ip as string, prefix as number, 'ipv6'));

export function isBlockedAddress(address: string): boolean {
    const family = net.isIP(address);
    if (family === 4) return blockList.check(address, 'ipv4');
    if (family === 6) {
        // IPv4-mapped IPv6 (::ffff:10.0.0.1)
        const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
        if (mapped) return blockList.check(mapped[1], 'ipv4');
        return blockList.check(address, 'ipv6');
    }
    return true;
}

const safeLookup = (hostname: string, options: any, callback: any) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses: any) => {
        if (err) return callback(err);
        const list = (Array.isArray(addresses) ? addresses : [{ address: addresses, family: options?.family || 4 }]);
        const blocked = list.find((a: any) => isBlockedAddress(a.address));
        if (blocked || list.length === 0) {
            return callback(new Error(`Blocked request to non-public address for host ${hostname}`));
        }
        if (options?.all) return callback(null, list);
        callback(null, list[0].address, list[0].family);
    });
};

export const safeHttpAgent = new http.Agent({ lookup: safeLookup } as any);
export const safeHttpsAgent = new https.Agent({ lookup: safeLookup } as any);

/**
 * Validates that a user-supplied URL is http(s) and points to a public host.
 * Throws with a client-safe message otherwise.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error('Invalid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL protocol');
    if (parsed.username || parsed.password) throw new Error('Credentials in URL are not allowed');

    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(host)) {
        if (isBlockedAddress(host)) throw new Error('URL host is not allowed');
        return parsed;
    }
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
        throw new Error('URL host is not allowed');
    }
    const addresses = await dns.promises.lookup(host, { all: true }).catch(() => []);
    if (addresses.length === 0) throw new Error('URL host could not be resolved');
    if (addresses.some(a => isBlockedAddress(a.address))) throw new Error('URL host is not allowed');
    return parsed;
}
