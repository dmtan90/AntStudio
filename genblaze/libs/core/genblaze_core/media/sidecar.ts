import fs from 'fs';
import path from 'path';

export class SidecarManager {
    public static getSidecarPath(mediaPath: string): string {
        return `${mediaPath}.genblaze.json`;
    }

    public static writeSidecar(mediaPath: string, manifestData: Record<string, any>): string {
        const sidecarPath = this.getSidecarPath(mediaPath);
        fs.writeFileSync(sidecarPath, JSON.stringify(manifestData, null, 2), 'utf-8');
        return sidecarPath;
    }

    public static readSidecar(mediaPath: string): Record<string, any> | null {
        const sidecarPath = this.getSidecarPath(mediaPath);
        if (fs.existsSync(sidecarPath)) {
            try {
                return JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
            } catch (_) {}
        }
        return null;
    }
}
