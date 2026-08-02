export class OptionalDependencyError extends Error {
    readonly extra: string;
    readonly package: string;
    readonly symbol: string | null;

    constructor(options: { extra: string; package: string; symbol?: string }) {
        const target = options.symbol ? options.symbol : `the ${options.package} integration`;
        const message = `${target} requires the optional dependency '${options.package}'. ` +
            `Install with: npm install ${options.package} (or npm install @genblaze/${options.extra}).`;
        super(message);
        this.name = 'OptionalDependencyError';
        this.extra = options.extra;
        this.package = options.package;
        this.symbol = options.symbol || null;
        Object.setPrototypeOf(this, OptionalDependencyError.prototype);
    }
}

export function requireOptional(extra: string, packageName: string, symbol?: string): void {
    try {
        if (typeof (globalThis as any).require === 'function') {
            (globalThis as any).require(packageName);
        }
    } catch (_) {
        throw new OptionalDependencyError({ extra, package: packageName, symbol });
    }
}
