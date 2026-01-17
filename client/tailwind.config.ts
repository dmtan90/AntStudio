import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
    content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}", "./src/**/*.css"],
    prefix: "",
    important: true,
    mode: 'jit', // Enable JIT mode
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6366f1',
                    dark: '#4f46e5',
                },
                dark: {
                    lighter: '#1f2937',
                    DEFAULT: '#111827',
                    darker: '#030712',
                    card: 'rgba(255, 255, 255, 0.03)',
                },
                brand: {
                    primary: '#ffffff',
                    accent: '#667eea',
                },
                glass: {
                    border: 'rgba(255, 255, 255, 0.08)',
                    light: 'rgba(255, 255, 255, 0.15)',
                }
            },
            backdropBlur: {
                xs: '2px',
            },
            transitionTimingFunction: {
                'cinematic': 'cubic-bezier(0.16, 1, 0.3, 1)',
            }
        }
    },
    plugins: [],
}
