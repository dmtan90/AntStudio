/**
 * Asset URL canonicalization and credential stripping helpers.
 */

const CREDENTIAL_QUERY_EXCLUDE = new Set([
    'access_token',
    'authorization',
    'awsaccesskeyid',
    'expires',
    'expires_in',
    'expiry',
    'key-pair-id',
    'response-cache-control',
    'response-content-disposition',
    'response-content-encoding',
    'response-content-language',
    'response-content-type',
    'x-id'
]);

const AWS_SIGV2_SIGNED_QUERY_PARAMS = new Set(['signature']);

const AZURE_SAS_QUERY_PARAMS = new Set([
    'se', 'sig', 'skoid', 'sks', 'sktid', 'skv', 'sp', 'spr', 'sr', 'srt', 'ss', 'st', 'sv'
]);

const CLOUDFRONT_SIGNED_QUERY_PARAMS = new Set(['expires', 'key-pair-id', 'policy', 'signature']);

const GCS_V2_SIGNED_QUERY_PARAMS = new Set(['expires', 'googleaccessid', 'signature']);

const CREDENTIAL_QUERY_PREFIX_EXCLUDE = ['x-amz-', 'x-goog-', 'x-bz-'];

function queryPairsPreservingPlus(query: string): Array<[string, string | null]> {
    if (!query) return [];
    const pairs: Array<[string, string | null]> = [];
    for (const rawPair of query.split('&')) {
        if (!rawPair) continue;
        const eqIdx = rawPair.indexOf('=');
        if (eqIdx === -1) {
            pairs.push([decodeURIComponent(rawPair), null]);
        } else {
            const rawName = rawPair.slice(0, eqIdx);
            const rawValue = rawPair.slice(eqIdx + 1);
            pairs.push([decodeURIComponent(rawName), decodeURIComponent(rawValue)]);
        }
    }
    return pairs;
}

function encodeQueryPairs(pairs: Array<[string, string | null]>): string {
    const encoded: string[] = [];
    for (const [name, value] of pairs) {
        const encodedName = encodeURIComponent(name);
        if (value === null) {
            encoded.push(encodedName);
        } else {
            encoded.push(`${encodedName}=${encodeURIComponent(value)}`);
        }
    }
    return encoded.join('&');
}

function isCredentialQueryParam(
    name: string,
    opts: {
        isAzureSas: boolean;
        isCloudFrontSigned: boolean;
        isGcsV2Signed: boolean;
        isAwsSigV2: boolean;
    }
): boolean {
    const key = name.toLowerCase();
    if (CREDENTIAL_QUERY_EXCLUDE.has(key)) return true;
    if (CREDENTIAL_QUERY_PREFIX_EXCLUDE.some(prefix => key.startsWith(prefix))) return true;
    if (opts.isAzureSas && AZURE_SAS_QUERY_PARAMS.has(key)) return true;
    if (opts.isCloudFrontSigned && CLOUDFRONT_SIGNED_QUERY_PARAMS.has(key)) return true;
    if (opts.isGcsV2Signed && GCS_V2_SIGNED_QUERY_PARAMS.has(key)) return true;
    if (opts.isAwsSigV2 && AWS_SIGV2_SIGNED_QUERY_PARAMS.has(key)) return true;
    return false;
}

/**
 * Strip known signed-URL credentials before storing or hashing asset URLs.
 */
export function stripAssetUrlCredentials(urlString: string): string {
    let parsed: URL;
    try {
        parsed = new URL(urlString);
    } catch (_) {
        return urlString;
    }

    const query = parsed.search.startsWith('?') ? parsed.search.slice(1) : parsed.search;
    const queryPairs = queryPairsPreservingPlus(query);
    const queryKeys = new Set(queryPairs.map(([name]) => name.toLowerCase()));

    const isAzureSas = ['sv', 'se', 'sp', 'sr', 'ss', 'srt'].some(k => queryKeys.has(k));
    const isCloudFrontSigned = queryKeys.has('key-pair-id');
    const isGcsV2Signed = queryKeys.has('googleaccessid');
    const isAwsSigV2 = queryKeys.has('awsaccesskeyid');

    const queryItems = queryPairs.filter(([name]) =>
        !isCredentialQueryParam(name, {
            isAzureSas,
            isCloudFrontSigned,
            isGcsV2Signed,
            isAwsSigV2
        })
    );

    queryItems.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        if (a[1] === null && b[1] !== null) return -1;
        if (a[1] !== null && b[1] === null) return 1;
        return (a[1] || '').localeCompare(b[1] || '');
    });

    const newQuery = encodeQueryPairs(queryItems);
    parsed.search = newQuery ? `?${newQuery}` : '';
    parsed.hash = '';

    return parsed.toString();
}
