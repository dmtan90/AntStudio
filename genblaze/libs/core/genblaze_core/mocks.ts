/**
 * Mock providers for pipeline testing.
 * 1:1 port of mocks.py
 */

import { ProviderErrorCode } from './models/enums.js';
import { Step } from './models/step.js';
import { Asset, createAsset } from './models/asset.js';

export interface MockProviderOptions {
    name?: string;
    assets?: Asset[] | ((step: Step) => Asset[]) | null;
    latency?: number;
    shouldFail?: boolean;
    errorCode?: ProviderErrorCode;
    errorMessage?: string;
    costUsd?: number | null;
}

export class MockProvider {
    name: string;
    private assets?: Asset[] | ((step: Step) => Asset[]) | null;
    latency: number;
    shouldFail: boolean;
    errorCode: ProviderErrorCode;
    errorMessage: string;
    costUsd?: number | null;

    callCount = 0;
    receivedSteps: Step[] = [];

    constructor(options: MockProviderOptions = {}) {
        this.name = options.name ?? 'mock';
        this.assets = options.assets;
        this.latency = options.latency ?? 0;
        this.shouldFail = options.shouldFail ?? false;
        this.errorCode = options.errorCode ?? ProviderErrorCode.UNKNOWN;
        this.errorMessage = options.errorMessage ?? 'Mock provider error';
        this.costUsd = options.costUsd;
    }

    protected defaultAssets(): Asset[] {
        return [
            createAsset({
                url: 'https://mock.test/output.bin',
                mediaType: 'application/octet-stream',
                sha256: '0'.repeat(64)
            })
        ];
    }

    async generate(step: Step): Promise<Step> {
        this.callCount++;
        this.receivedSteps.push(step);

        if (this.latency > 0) {
            await new Promise(r => setTimeout(r, this.latency * 1000));
        }

        if (this.shouldFail) {
            const err = new Error(this.errorMessage);
            (err as any).errorCode = this.errorCode;
            throw err;
        }

        let resolved: Asset[];
        if (typeof this.assets === 'function') {
            resolved = this.assets(step);
        } else if (this.assets) {
            resolved = this.assets;
        } else {
            resolved = this.defaultAssets();
        }

        step.assets.push(...resolved);
        if (this.costUsd != null) {
            step.costUsd = this.costUsd;
        }

        return step;
    }
}

export class MockVideoProvider extends MockProvider {
    constructor(options: MockProviderOptions = {}) {
        super({ name: 'mock-video', ...options });
    }

    protected defaultAssets(): Asset[] {
        return [
            createAsset({
                url: 'https://mock.test/video.mp4',
                mediaType: 'video/mp4',
                sha256: '1'.repeat(64),
                video: { codec: 'h264', hasAudio: false }
            })
        ];
    }
}

export class MockAudioProvider extends MockProvider {
    constructor(options: MockProviderOptions = {}) {
        super({ name: 'mock-audio', ...options });
    }

    protected defaultAssets(): Asset[] {
        return [
            createAsset({
                url: 'https://mock.test/audio.mp3',
                mediaType: 'audio/mpeg',
                sha256: '2'.repeat(64),
                audio: { codec: 'mp3', channels: 1, sampleRate: 44100 }
            })
        ];
    }
}
