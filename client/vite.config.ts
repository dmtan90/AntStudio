import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
// import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl';
const HOST = "antstudio.agrhub.com";
const WEB_URL = `https://${HOST}`;
// const API_URL = `https://${HOST}/api`;
// const SOCKET_URL = `wss://${HOST}/socket.io`;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: ([
        vue(),
        basicSsl(),
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
    ]) as any,
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '~': fileURLToPath(new URL('./src', import.meta.url)),
            'video-editor': fileURLToPath(new URL('./src/plugins/video-editor', import.meta.url)),
            'audio-visual': fileURLToPath(new URL('./src/plugins/video-editor/plugins/audio-visual', import.meta.url)),
            // 'vidmate': fileURLToPath(new URL('./src/plugins/video-editor/vidmate', import.meta.url))
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `
                    @use "@/assets/scss/_variables.scss" as *;
                    @use "@/assets/scss/_mixins.scss" as *;
                `
            }
        }
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        https: {},

        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            // "Cross-Origin-Embedder-Policy": "credentialless",
        },
        proxy: {
            '/socket.io': {
                target: WEB_URL,
                ws: true,
                changeOrigin: true,
                secure: false,
                configure: (proxy: any, _options: any) => {
                    proxy.on('error', (err: any, _req: any, _res: any) => {
                        console.log('[Proxy] Error:', err.message);
                    });
                }
            },
            '/api/socket.io': {
                target: WEB_URL,
                ws: true,
                changeOrigin: true,
                secure: false,
                rewrite: (path: string) => path.replace(/^\/api\/socket\.io/, '/socket.io')
            },
            '/api': {
                target: WEB_URL,
                changeOrigin: true,
                secure: false,
                ws: true,
                // rewrite: (path: string) => path.replace(/^\/api/, '/AntStudio/rest')
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    },
    optimizeDeps: {
        exclude: ['mediabunny', '@ffmpeg/ffmpeg', '@ffmpeg/util', '@huggingface/transformers', '@mediapipe/tasks-vision']
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }
})
