/**
 * Live-API wire-conformance probe for GMICloud.
 * 1:1 port of tools/probe_gmicloud_wire.py
 */

export interface ProbeResult {
    slug: string;
    keyTested: string;
    accepted: boolean;
    statusCode: number;
    errorExcerpt?: string;
}

export async function probeGMICloudWire(apiKey: string, slug: string, payload: Record<string, any>): Promise<ProbeResult> {
    const url = 'https://api.gmi-serving.com/v1/chat/completions';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: slug, ...payload })
        });

        const accepted = res.ok;
        const errText = accepted ? undefined : await res.text();
        return {
            slug,
            keyTested: Object.keys(payload).join(','),
            accepted,
            statusCode: res.status,
            errorExcerpt: errText?.slice(0, 200)
        };
    } catch (err: any) {
        return {
            slug,
            keyTested: Object.keys(payload).join(','),
            accepted: false,
            statusCode: 0,
            errorExcerpt: err.message
        };
    }
}
