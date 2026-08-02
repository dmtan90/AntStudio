/** Base sink abstract class. 1:1 port of sinks/base.py */

import { Asset } from '../models/asset.js';
import { Run } from '../models/run.js';
import { Step } from '../models/step.js';
import { Manifest } from '../models/manifest.js';

export abstract class BaseSink {
    /** When true, Pipeline.run() will close this sink in its finally block. */
    protected _closeWithRun: boolean = true;

    /** Persist a completed run and its manifest. */
    abstract writeRun(run: Run, manifest: Manifest): Promise<void> | void;

    /**
     * Pipeline hook — called after each step finishes execution.
     * Default is a no-op. Sinks supporting eager asset transfer override this.
     */
    onStepComplete(step: Step, options: { runId: string; tenantId: string | null; dateStr: string }): void {}

    /**
     * Write a single asset's bytes to the sink and return it updated.
     * Default raises NotImplementedError.
     */
    putAsset(asset: Asset, options?: { manifestUri?: string | null; tenantId?: string | null }): Promise<Asset> {
        throw new Error(`${this.constructor.name} does not implement putAsset()`);
    }

    /**
     * Bulk variant of putAsset.
     * Default raises NotImplementedError.
     */
    putAssets(assets: Asset[], options?: { manifestUri?: string | null; tenantId?: string | null }): Promise<Asset[]> {
        throw new Error(`${this.constructor.name} does not implement putAssets()`);
    }

    /**
     * Reverse-lookup: given an asset_id, return the manifest that references it.
     * Default raises NotImplementedError.
     */
    readManifestForAsset(
        assetId: string,
        options: { tenantId: string; verify?: boolean; allowUnverifiedAssets?: boolean }
    ): Promise<Manifest | null> {
        throw new Error(`${this.constructor.name} does not implement readManifestForAsset()`);
    }

    /** Release any held resources. Must be idempotent. */
    abstract close(): void | Promise<void>;

}
