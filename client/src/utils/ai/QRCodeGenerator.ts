import QRCode from 'qrcode';

/**
 * Utility for generating scannable QR codes for commerce.
 * Uses the `qrcode` npm library for offline, canvas-based generation —
 * no external API calls, no network dependency.
 */
export class QRCodeGenerator {
    /**
     * Generate a QR code data URL for a given URL.
     * @param url The URL to encode
     * @param size Pixel size (default 200)
     * @returns A Promise resolving to a base64 data URL image
     */
    public static async getProductQR(url: string, size = 200): Promise<string> {
        try {
            const dataUrl = await QRCode.toDataURL(url, {
                width: size,
                margin: 1,
                color: {
                    dark: '#F97316',  // Orange 500 — AntStudio brand
                    light: '#000000'  // Black background
                }
            });
            return dataUrl;
        } catch (e) {
            console.error('[QRCodeGenerator] Failed to generate QR code:', e);
            return '';
        }
    }
}
