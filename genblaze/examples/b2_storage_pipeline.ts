/**
 * B2 S3-compatible storage pipeline example.
 * 1:1 port of examples/b2_storage_pipeline.py
 */

import { Pipeline, Modality } from '../libs/core/genblaze_core/index.js';
import { S3StorageBackend } from '../libs/connectors/s3/genblaze_s3/index.js';

async function main() {
    console.log('📦 Running B2 Storage Pipeline Example...');

    const storage = new S3StorageBackend({
        bucket: process.env.B2_BUCKET || 'my-b2-bucket',
        endpoint: process.env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
        region: process.env.B2_REGION || 'us-west-004'
    });

    console.log('B2 storage configured:', storage);
}

main().catch(console.error);
