import fs from 'fs';
import path from 'path';

export interface StepCompleteEvent {
    stepIndex: number;
    totalSteps: number;
    step: any;
    elapsedSec: number;
}

export class PipelineResult {
    readonly run: any;
    readonly manifest: any;

    constructor(run: any, manifest: any) {
        this.run = run;
        this.manifest = manifest;
    }

    public failedSteps(): any[] {
        return (this.run.steps || []).filter((s: any) => s.status === 'failed');
    }

    public succeededSteps(): any[] {
        return (this.run.steps || []).filter((s: any) => s.status === 'succeeded');
    }

    public errorSummary(): string | null {
        const lines: string[] = [];
        (this.run.steps || []).forEach((step: any, i: number) => {
            if (step.error) {
                lines.push(`Step ${i} (${step.provider}/${step.model}): ${step.error}`);
            }
        });
        if (this.manifest.transferFailures?.length) {
            lines.push(`Asset transfers failed: ${this.manifest.transferFailures.join(', ')}`);
        }
        return lines.length > 0 ? lines.join('\n') : null;
    }

    public save(outputPath: string): void {
        const sidecarPath = `${outputPath}.genblaze.json`;
        fs.writeFileSync(sidecarPath, JSON.stringify(this.manifest, null, 2), 'utf-8');
    }
}
