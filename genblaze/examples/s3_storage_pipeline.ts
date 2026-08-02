/**
 * S3 storage pipeline example.
 * 1:1 port of examples/s3_storage_pipeline.py
 */

import { S3StorageBackend } from '../libs/connectors/s3/genblaze_s3/index.js';

async function main() {
    console.log('🪣 Running S3 Storage Pipeline Example...');
    const s3 = new S3StorageBackend({ bucket: 'my-s3-bucket', region: 'us-east-1' });
    console.log('S3 backend initialized:', s3);
}

main().catch(console.error);
