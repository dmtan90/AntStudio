/**
 * Utility for generating scannable QR codes.
 * Primarily used for Dynamic Live Commerce.
 */
export class QRGenerator {
    /**
     * Generates a QR code data URL for a given string.
     * Uses a fast, high-availability public API for generation to keep the client package lightweight.
     */
    public static async generateDataURL(text: string, size: number = 250): Promise<string> {
        try {
            const encodedText = encodeURIComponent(text);
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;

            // Fetch and convert to base64 to allow canvas embedding (avoid CORS issues during drawImage)
            const response = await fetch(url);
            const blob = await response.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("[QRGenerator] Failed to generate QR:", e);
            // Fallback: A pixelated placeholder or empty string
            return "";
        }
    }

    /**
     * Pre-loads a QR code into an Image object for canvas drawing.
     */
    public static async generateImage(text: string, size: number = 250): Promise<HTMLImageElement> {
        const dataUrl = await this.generateDataURL(text, size);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
}
