import { Pipeline, Modality, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { GMICloudChatClient } from '../libs/connectors/gmicloud/genblaze_gmicloud/index.js';
import { S3StorageBackend } from '../libs/connectors/s3/genblaze_s3/index.js';

async function main() {
    console.log('🚀 Running Genblaze Quickstart...');

    const storage = new S3StorageBackend({ bucket: 'my-bucket' });

    const gmi = new GMICloudChatClient();
    const chatRes = await gmi.chat({
        prompt: 'Hello from Genblaze TS Quickstart!'
    });

    console.log('Chat response:', chatRes.text);
}

main().catch(console.error);
