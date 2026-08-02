/**
 * Pricing context and packaged strategies.
 * 1:1 port of providers/pricing.py
 */

export class PricingContext {
    readonly step: any;
    readonly assets: any[];
    readonly providerPayload: Record<string, any>;

    constructor(step: any, assets: any[] = [], providerPayload: Record<string, any> = {}) {
        this.step = step;
        this.assets = assets;
        this.providerPayload = providerPayload;
    }

    get outputCount(): number {
        return this.assets.length;
    }

    get outputDurationS(): number | null {
        let total = 0;
        let found = false;
        for (const a of this.assets) {
            if (a.duration != null) {
                total += a.duration;
                found = true;
            }
        }
        return found ? total : null;
    }
}

export type PricingStrategy = (context: PricingContext) => number | null;

export function fixedCost(usd: number): PricingStrategy {
    return () => usd;
}

export function perOutputAsset(usdPerAsset: number): PricingStrategy {
    return (ctx: PricingContext) => ctx.outputCount * usdPerAsset;
}

export function perOutputDuration(usdPerSecond: number): PricingStrategy {
    return (ctx: PricingContext) => {
        const dur = ctx.outputDurationS;
        return dur != null ? dur * usdPerSecond : null;
    };
}
