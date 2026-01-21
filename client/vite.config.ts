import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
// import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        AutoImport({
            imports: [
                'vue',
                'vue-router',
                'pinia',
                {
                    'vue-sonner': ['toast']
                }
            ],
            resolvers: [ElementPlusResolver()],
            dts: 'src/auto-imports.d.ts',
            eslintrc: {
                enabled: true
            }
        }),
        Components({
            resolvers: [ElementPlusResolver()],
            dts: 'src/components.d.ts',
            dirs: ['src/components']
        }),
        // VitePWA({
        //     registerType: 'autoUpdate',
        //     devOptions: {
        //         enabled: true
        //     },
        //     includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        //     manifest: {
        //         name: 'AntFlow Media Studio',
        //         short_name: 'AntFlow',
        //         description: 'Professional Media Studio',
        //         theme_color: '#ffffff',
        //         icons: [
        //             {
        //                 src: 'pwa-192x192.png',
        //                 sizes: '192x192',
        //                 type: 'image/png'
        //             },
        //             {
        //                 src: 'pwa-512x512.png',
        //                 sizes: '512x512',
        //                 type: 'image/png'
        //             }
        //         ]
        //     },
        //     workbox: {
        //         globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        //         runtimeCaching: [
        //             {
        //                 urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        //                 handler: 'CacheFirst',
        //                 options: {
        //                     cacheName: 'google-fonts-cache',
        //                     expiration: {
        //                         maxEntries: 10,
        //                         maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
        //                     },
        //                     cacheableResponse: {
        //                         statuses: [0, 200]
        //                     }
        //                 }
        //             },
        //             {
        //                 urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        //                 handler: 'CacheFirst',
        //                 options: {
        //                     cacheName: 'gstatic-fonts-cache',
        //                     expiration: {
        //                         maxEntries: 10,
        //                         maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
        //                     },
        //                     cacheableResponse: {
        //                         statuses: [0, 200]
        //                     }
        //                 }
        //             },
        //             {
        //                 urlPattern: /\/api\/s3\/.*/i,
        //                 handler: 'CacheFirst',
        //                 options: {
        //                     cacheName: 's3-media-cache',
        //                     expiration: {
        //                         maxEntries: 200,
        //                         maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
        //                     },
        //                     cacheableResponse: {
        //                         statuses: [0, 200]
        //                     },
        //                     // Note: rangeRequests support in generateSW mode requires specific plugins or custom handling.
        //                     // Basic CacheFirst might choke on Range headers if not handled.
        //                     // For now, we use StaleWhileRevalidate for video to be safer or accept full download.
        //                     // Actually, let's try StaleWhileRevalidate for broad compatibility or stick to CacheFirst if we assume full downloads.
        //                     // Given it's a video editor, seeking is key. Range requests are complex in SW.
        //                     // We will start with CacheFirst and see if it works for chunks.
        //                 }
        //             }
        //         ]
        //     }
        // })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '~': fileURLToPath(new URL('./src', import.meta.url)),
            'video-editor': fileURLToPath(new URL('./src/views/video-editor', import.meta.url)),
            'audio-visual': fileURLToPath(new URL('./src/views/video-editor/plugins/audio-visual', import.meta.url)),
            // 'vidmate': fileURLToPath(new URL('./src/views/video-editor/vidmate', import.meta.url))
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                additionalData: `
                    @use "@/assets/scss/_variables.scss" as *;
                    @use "@/assets/scss/_mixins.scss" as *;
                `
            }
        }
    },
    server: {
        port: 3000,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    },
    optimizeDeps: {
        exclude: ['mediabunny', '@ffmpeg/ffmpeg', '@ffmpeg/util', '@huggingface/transformers']
    }
})
