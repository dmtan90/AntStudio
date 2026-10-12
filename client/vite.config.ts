import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
// import { VitePWA } from 'vite-plugin-pwa'
// import basicSsl from '@vitejs/plugin-basic-ssl';
//local dev server
const HOST = "127.0.0.1:5000";
const WEB_URL = `http://127.0.0.1:5000`;
const SOCKET_URL = `http://127.0.0.1:5000`;
//production server
// const HOST = "antstudio.agrhub.com"
// const WEB_URL = `https://${HOST}`;
// const WEB_URL = `http://${HOST}`;
// const API_URL = `https://${HOST}/api`;
// const SOCKET_URL = `wss://${HOST}/socket.io`;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: ([
        vue(),
        // basicSsl(),
        {
            name: 'ignore-mediapipe-sourcemap',
            enforce: 'pre',
            transform(code: string, id: string) {
                if (id.includes('@mediapipe') || id.includes('vision_bundle_mjs')) {
                    return {
                        code: code.replace(/\/\/# sourceMappingURL=.*/g, ''),
                        map: null
                    }
                }
            }
        },
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
            dts: false,
            eslintrc: {
                enabled: true
            }
        }),
        Components({
            resolvers: [ElementPlusResolver()],
            dts: false,
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
        // https: {},
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
            // "Cross-Origin-Embedder-Policy": "credentialless",
        },
        proxy: {
            '/socket.io': {
                target: SOCKET_URL,
                ws: true,
                changeOrigin: true,
                secure: false,
                configure: (proxy: any, _options: any) => {
                    proxy.on('error', (err: any, _req: any, _res: any) => {
                        if (err.code !== 'ECONNRESET' && err.code !== 'ECONNABORTED') {
                            console.log('[Proxy] Error:', err.message);
                        }
                    });
                    proxy.on('proxyReqWs', (_proxyReq: any, _req: any, socket: any) => {
                        socket.on('error', (_err: any) => {});
                    });
                }
            },
            '/api/socket.io': {
                target: SOCKET_URL,
                ws: true,
                changeOrigin: true,
                secure: false,
                rewrite: (path: string) => path.replace(/^\/api\/socket\.io/, '/socket.io'),
                configure: (proxy: any, _options: any) => {
                    proxy.on('error', (err: any, _req: any, _res: any) => {
                        if (err.code !== 'ECONNRESET' && err.code !== 'ECONNABORTED') {
                            console.log('[Proxy] Error:', err.message);
                        }
                    });
                    proxy.on('proxyReqWs', (_proxyReq: any, _req: any, socket: any) => {
                        socket.on('error', (_err: any) => {});
                    });
                }
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
        sourcemap: false,
        minify: 'esbuild',
        cssMinify: true,
        target: 'esnext',
        rollupOptions: {
            output: {
                // Heavy libraries get stable, separately cached chunks that load only with the routes using them
                manualChunks(id: string) {
                    // Rollup pulls a manual chunk's unassigned dependencies into that chunk, so shared
                    // runtime pieces get their own chunks; otherwise Vue/helpers end up inside e.g. vendor-charts
                    // and every page has to load it.
                    if (id.includes('commonjsHelpers')) return 'vendor-runtime'
                    if (!id.includes('node_modules')) return undefined
                    if (/[\\/]node_modules[\\/](vue|@vue|vue-router|pinia|vue-i18n|@intlify)[\\/]/.test(id)) return 'vendor-vue'
                    if (/[\\/]node_modules[\\/](three|@pixiv)[\\/]/.test(id)) return 'vendor-three'
                    if (/[\\/]node_modules[\\/](pixi\.js|@pixi|pixi-live2d-display-advanced)[\\/]/.test(id)) return 'vendor-pixi'
                    if (/[\\/]node_modules[\\/]fabric[\\/]/.test(id)) return 'vendor-fabric'
                    if (/[\\/]node_modules[\\/]@ffmpeg[\\/]/.test(id)) return 'vendor-ffmpeg'
                    if (/[\\/]node_modules[\\/](@huggingface|onnxruntime-web|onnxruntime-common)[\\/]/.test(id)) return 'vendor-transformers'
                    if (/[\\/]node_modules[\\/]@mediapipe[\\/]/.test(id)) return 'vendor-mediapipe'
                    if (/[\\/]node_modules[\\/]tesseract\.js[\\/]/.test(id)) return 'vendor-tesseract'
                    if (/[\\/]node_modules[\\/](chart\.js|vue-chartjs)[\\/]/.test(id)) return 'vendor-charts'
                    return undefined
                }
            }
        }
    },
    optimizeDeps: {
        exclude: ['mediabunny', '@ffmpeg/ffmpeg', '@ffmpeg/util', '@huggingface/transformers', '@mediapipe/tasks-vision']
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }
})
