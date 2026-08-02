import { BaseProviderAdapter } from '../pipeline.js';

export class ProviderRegistry {
    private static providers: Map<string, BaseProviderAdapter> = new Map();

    public static register(provider: BaseProviderAdapter): void {
        this.providers.set(provider.name.toLowerCase(), provider);
    }

    public static get(name: string): BaseProviderAdapter | undefined {
        return this.providers.get(name.toLowerCase());
    }

    public static list(): string[] {
        return Array.from(this.providers.keys());
    }
}
