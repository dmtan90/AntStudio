import { Pipeline, Modality, ManifestBuilder, BaseTestProviderAdapter } from '../libs/core/genblaze_core/index.js';
import { S3StorageBackend } from '../libs/connectors/s3/genblaze_s3/index.js';

async function main() {
    console.log('⚡ Running Offline Local Genblaze Quickstart...');

    const storage = new S3StorageBackend({ bucket: 'local-test-bucket' });

    const mockProvider = new BaseTestProviderAdapter();
    const pipe = new Pipeline('local-offline-pipeline');
    pipe.step(mockProvider, {
        model: 'gemini-2.0-flash',
        prompt: 'Offline script test',
        modality: Modality.TEXT
    });

    const result = await pipe.run(storage);

    console.log(`Manifest: ${result.manifest.manifestUri}`);
    console.log(`Hash:      ${result.manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(result.manifest, result.run)}`);
}

main().catch(console.error);
