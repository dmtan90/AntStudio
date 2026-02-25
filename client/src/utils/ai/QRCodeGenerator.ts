/**
 * Utility for generating scannable QR codes for commerce.
 * In a production environment, this would use a local library, 
 * but for this demo, we use a high-performance external API with orange branding.
 */
export class QRCodeGenerator {
    /**
     * Generate a QR code URL for a product
     * @param url The product link
     * @returns A URL to the QR code image
     */
    public static getProductQR(url: string): string {
        const encodedUrl = encodeURIComponent(url);
        // Using qrserver API with AntStudio orange (#f97316)
        return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=f97316&bgcolor=000000&data=${encodedUrl}`;
    }
}
