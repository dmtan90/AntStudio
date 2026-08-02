export class PresignedURL {
    readonly url: string;
    readonly expiresIn: number;

    constructor(url: string, expiresIn: number) {
        this.url = url;
        this.expiresIn = expiresIn;
    }

    public toString(): string {
        return `[PresignedURL expires_in=${this.expiresIn}s]`;
    }
}
