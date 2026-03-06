export type StreamQuality = 'low' | 'medium' | 'high' | 'ultra' | 'auto';

export class ABRStateMachine {
    private lastQualitySwitch = 0;
    private readonly QUALITY_SWITCH_COOLDOWN = 10000;
    private effectiveQuality: string = 'high';

    public get currentQuality(): string {
        return this.effectiveQuality;
    }

    public determineQuality(bitrate: number): string | null {
        const now = Date.now();
        if (now - this.lastQualitySwitch < this.QUALITY_SWITCH_COOLDOWN) return null;

        let targetQuality = this.effectiveQuality;
        if (bitrate < 600) targetQuality = 'low';
        else if (bitrate < 1500) targetQuality = 'medium';
        else if (bitrate < 3000) targetQuality = 'high';
        else if (bitrate > 4500) targetQuality = 'ultra';

        if (targetQuality !== this.effectiveQuality) {
            this.effectiveQuality = targetQuality;
            this.lastQualitySwitch = now;
            return targetQuality;
        }

        return null;
    }

    public setQuality(quality: string) {
        if (this.effectiveQuality !== quality) {
            this.effectiveQuality = quality;
            this.lastQualitySwitch = Date.now();
        }
    }
}
