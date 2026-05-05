import * as PIXI from 'pixi.js';

/**
 * useSaleAudioVisualizer
 * Pixi-native spectral ring visualizer.
 * Provides a React-to-audio ring around a character.
 */
export function useSaleAudioVisualizer(app: PIXI.Application | null) {
    const mainContainer = new PIXI.Container();
    mainContainer.name = 'AudioVisualizerLayer';

    // Map of Character UUID -> Visualizer Graphics
    const rings = new Map<string, PIXI.Graphics>();

    const BAR_COUNT = 32;
    const RADIUS = 120;
    const MAX_BAR_HEIGHT = 40;

    const getOrCreateRing = (uuid: string) => {
        if (rings.has(uuid)) return rings.get(uuid)!;

        const graphics = new PIXI.Graphics();
        graphics.name = `Ring_${uuid}`;
        mainContainer.addChild(graphics);
        rings.set(uuid, graphics);
        return graphics;
    };

    /**
     * Update the visualizer for a specific character
     * @param uuid Character UUID
     * @param audioLevel 0.0 - 1.0 peak level
     */
    const updateRing = (uuid: string, audioLevel: number, x: number, y: number, scale: number) => {
        const graphics = getOrCreateRing(uuid);
        graphics.clear();
        
        graphics.x = x;
        graphics.y = y;
        graphics.scale.set(scale);

        if (audioLevel < 0.05) return; // Silent threshold

        const color = 0x6366f1; // Indigo 500

        for (let i = 0; i < BAR_COUNT; i++) {
            const angle = (i / BAR_COUNT) * Math.PI * 2;
            const barHeight = audioLevel * MAX_BAR_HEIGHT * (0.8 + Math.random() * 0.4);
            
            const startX = Math.cos(angle) * RADIUS;
            const startY = Math.sin(angle) * RADIUS;
            const endX = Math.cos(angle) * (RADIUS + barHeight);
            const endY = Math.sin(angle) * (RADIUS + barHeight);

            graphics.lineStyle(4, color, 0.8);
            graphics.moveTo(startX, startY);
            graphics.lineTo(endX, endY);
        }
    };

    const disposeRing = (uuid: string) => {
        const ring = rings.get(uuid);
        if (ring) {
            ring.destroy();
            rings.delete(uuid);
        }
    };

    return {
        container: mainContainer,
        updateRing,
        disposeRing
    };
}
