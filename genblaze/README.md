<!-- last_verified: 2026-07-21 -->
<h1 align="center" style="border-bottom: none">
    Genblaze (TypeScript / JavaScript Edition)
</h1>
<h2 align="center" style="border-bottom: none">
    Pipeline SDK for AI-generated video, audio, and images with built-in provenance.
</h2>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)](https://typescriptlang.org)

</div>

**Genblaze** is an AI pipeline SDK by [Backblaze](https://www.backblaze.com/cloud-storage) for building and orchestrating generative media workflows across video, image, and audio.

A unified `Pipeline` API spans providers like OpenAI, Google, Runway, Luma, ElevenLabs, and Stability Audio, plus models served through platforms such as GMI Cloud and NVIDIA NIM (`build.nvidia.com`) — so you swap providers without rewriting orchestration. Every run produces a canonical provenance manifest you can embed directly into media files (`.mp4`, `.png`, `.mp3`, …) and persist to [Backblaze B2](https://www.backblaze.com/cloud-storage) or any S3-compatible store. `ManifestBuilder.verify()` checks the manifest hash and requires every output asset to declare a valid `sha256`.

## Why Genblaze

- **Provenance by default.** Every run yields a canonical manifest — deterministic, embeddable into `.mp4 / .png / .jpg / .webp / .mp3 / .wav`, or persisted alongside the asset. Outputs become SHA-256-covered when providers return bytes or `ObjectStorageSink` transfers them into durable storage.
- **One pipeline, many providers.** 11 adapters across video, image, audio, and chat behind a single `Pipeline` / `Step` API.
- **Storage is first-class.** `S3StorageBackend.for_backblaze("bucket")` ships durable, credential-free asset URLs and content-addressable layouts. Designed for Backblaze B2; works against any S3-compatible store (AWS S3, Cloudflare R2, MinIO).
- **Fallback chains and conformance.** `fallbackModels=[...]` retries on model errors automatically.
- **Replayable runs.** Every manifest captures the full provenance — provider, model, prompt, params, timestamps — so a run can be reconstructed via `genblaze replay manifest.json`.

## Quickstart

```typescript
import { Pipeline, Modality, ManifestBuilder } from './libs/core/genblaze_core/index.js';
import { GMICloudVideoProvider } from './libs/connectors/gmicloud/genblaze_gmicloud/index.js';
import { S3StorageBackend } from './libs/connectors/s3/genblaze_s3/index.js';

const storage = S3StorageBackend.for_backblaze("my-bucket");

const result = await new Pipeline("my-first-pipeline")
    .step(new GMICloudVideoProvider(), {
        model: "seedance-2-0-260128",
        prompt: "A drone shot soaring over a coastal city at golden hour",
        modality: Modality.VIDEO,
        params: { duration: 10, aspect_ratio: "16:9" }
    })
    .run(storage);

console.log(`Asset URL: ${result.run.steps[0].assets[0].url}`);
console.log(`SHA-256:   ${result.run.steps[0].assets[0].sha256}`);
console.log(`Manifest:  ${result.manifest.manifestUri}`);
console.log(`Hash:      ${result.manifest.canonicalHash}`);
console.log(`Verified:  ${ManifestBuilder.verify(result.manifest, result.run)}`);
```

## CLI Usage

```bash
# Verify provenance manifest
genblaze verify ./manifest.json --fetch

# Extract embedded manifest hash from binary MP4 / PNG / JPEG
genblaze extract ./generated_video.mp4

# Replay pipeline plan
genblaze replay ./manifest.json
```
