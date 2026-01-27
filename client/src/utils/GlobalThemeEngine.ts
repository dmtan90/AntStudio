/**
 * Engine for unified network branding and global theme propagation.
 */
export class GlobalThemeEngine {
    private currentTheme: any = {
        primaryColor: '#3b82f6',
        accentColor: '#a855f7',
        fontFamily: 'Inter, sans-serif'
    };

    /**
     * Updates the global CSS variables for the entire network.
     */
    public applyTheme(themeConfig: any) {
        this.currentTheme = { ...this.currentTheme, ...themeConfig };

        const root = document.documentElement;
        root.style.setProperty('--network-primary', this.currentTheme.primaryColor);
        root.style.setProperty('--network-accent', this.currentTheme.accentColor);
        root.style.setProperty('--network-font', this.currentTheme.fontFamily);

        console.log(`🎨 [GlobalTheme] Network-wide brand refresh applied: ${JSON.stringify(this.currentTheme)}`);
    }

    public getCurrentTheme() {
        return this.currentTheme;
    }
}

export const globalThemeEngine = new GlobalThemeEngine();
