import fs from 'fs';
import path from 'path';

console.log('📊 Generating Genblaze Model Matrix documentation for TypeScript Monorepo...');

const matrixDoc = `# Genblaze Model Matrix (TypeScript/JavaScript Edition)

| Provider | Model Slug | Supported Modalities | Output Formats |
|---|---|---|---|
| GMI Cloud | seedance-2-0-260128 | Video | video/mp4 |
| Google | gemini-2.0-flash | Text, Chat | text/plain |
| Google | imagen-3.0-generate-002 | Image | image/png |
| Google | veo-2.0-generate-001 | Video | video/mp4 |
| OpenAI | gpt-4o | Text, Chat | text/plain |
| OpenAI | dall-e-3 | Image | image/png |
| OpenAI | tts-1 | Audio | audio/mpeg |
| ElevenLabs | eleven_turbo_v2 | Audio | audio/mpeg |
| Runway | gen3a_turbo | Video | video/mp4 |
| Luma | dream-machine | Video | video/mp4 |
| NVIDIA NIM | cosmos-1.0 | Video, Audio | video/mp4 |
`;

const outputPath = path.join(process.cwd(), 'docs', 'reference', 'model-matrix.md');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, matrixDoc, 'utf-8');
console.log(`✅ Model matrix written to ${outputPath}`);
