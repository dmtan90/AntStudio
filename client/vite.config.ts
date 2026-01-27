import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { VitePWA } from 'vite-plugin-pwa'

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
        //     includeAssets: ['favicon.ico', 'icon.png', 'logo.png', 'splash.png'],
        //     manifest: {
        //         name: 'AntStudio Media Engine',
        //         short_name: 'AntStudio',
        //         description: 'Autonomous AI Production & Broadcasting Hub',
        //         theme_color: '#000000',
        //         background_color: '#000000',
        //         icons: [
        //             {
        //                 src: 'icon.png',
        //                 sizes: '192x192',
        //                 type: 'image/png',
        //                 purpose: 'any maskable'
        //             },
        //             {
        //                 src: 'icon.png',
        //                 sizes: '512x512',
        //                 type: 'image/png'
        //             }
        //         ]
        //     },
        //     workbox: {
        //         globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        //         runtimeCaching: [
        //             {
        //                 urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        //                 handler: 'CacheFirst',
        //                 options: {
        //                     cacheName: 'google-fonts-cache',
        //                     expiration: {
        //                         maxEntries: 10,
        //                         maxAgeSeconds: 60 * 60 * 24 * 365
        //                     },
        //                     cacheableResponse: {
        //                         statuses: [0, 200]
        //                     }
        //                 }
        //             },
        //             {
        //                 urlPattern: /\/api\/projects.*/i,
        //                 handler: 'NetworkFirst',
        //                 options: {
        //                     cacheName: 'api-projects-cache',
        //                     expiration: {
        //                         maxEntries: 50,
        //                         maxAgeSeconds: 60 * 60 * 24 // 1 Day
        //                     }
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
