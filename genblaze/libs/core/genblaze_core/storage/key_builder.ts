function normalizeSegments(s: string): string[] {
    return s.split('/').filter(Boolean);
}

function joinWithSeamDedupe(prefixParts: string[], argParts: string[]): string {
    if (prefixParts.length > 0 && argParts.length > 0 && prefixParts[prefixParts.length - 1] === argParts[0]) {
        argParts = argParts.slice(1);
    }
    return [...prefixParts, ...argParts].join('/');
}

export class KeyBuilder {
    readonly prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    public static fromPrefix(prefix: string): KeyBuilder {
        return new KeyBuilder(normalizeSegments(prefix).join('/'));
    }

    public append(...segments: string[]): KeyBuilder {
        const prefixParts = normalizeSegments(this.prefix);
        const argParts: string[] = [];
        for (const seg of segments) {
            argParts.push(...normalizeSegments(seg));
        }
        return new KeyBuilder(joinWithSeamDedupe(prefixParts, argParts));
    }

    public build(...segments: string[]): string {
        const prefixParts = normalizeSegments(this.prefix);
        const argParts: string[] = [];
        for (const seg of segments) {
            argParts.push(...normalizeSegments(seg));
        }
        return joinWithSeamDedupe(prefixParts, argParts);
    }
}
