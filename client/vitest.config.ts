import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'

// Kept separate from vite.config.ts so unit tests don't load the app's build plugins/dev proxy
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '~': fileURLToPath(new URL('./src', import.meta.url)),
            'video-editor': fileURLToPath(new URL('./src/plugins/video-editor', import.meta.url)),
            'audio-visual': fileURLToPath(new URL('./src/plugins/video-editor/plugins/audio-visual', import.meta.url))
        }
    },
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'happy-dom',
        restoreMocks: true
    }
})
