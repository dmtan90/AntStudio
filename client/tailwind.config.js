/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}", "./src/**/*.css"],
    prefix: "",
    important: true,
    mode: 'jit',
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
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
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
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
