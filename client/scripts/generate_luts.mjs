
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const LUT_SIZE = 512; // Standard 64^3 LUT laid out in 8x8 grid
const TILE_SIZE = 64;

function createLUT(name, cb) {
    const canvas = createCanvas(LUT_SIZE, LUT_SIZE);
    const ctx = canvas.getContext('2d');

    // Iterate over Blue tiles (8x8 grid)
    for (let by = 0; by < 8; by++) {
        for (let bx = 0; bx < 8; bx++) {
            // Calculate Blue value for this tile (0-63)
            const b = (by * 8 + bx) * 4; // approximate mapping 0-255

            // Draw Green/Red gradient for this tile
            for (let g = 0; g < TILE_SIZE; g++) {
                for (let r = 0; r < TILE_SIZE; r++) {
                    const red = Math.floor(r * (255 / (TILE_SIZE - 1)));
                    const green = Math.floor(g * (255 / (TILE_SIZE - 1)));
                    const blue = Math.floor(b);

                    // Apply filter callback
                    const [fr, fg, fb] = cb(red, green, blue);

                    ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
                    ctx.fillRect(bx * TILE_SIZE + r, by * TILE_SIZE + g, 1, 1);
                }
            }
        }
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join('public', 'luts', `${name}.png`), buffer);
    console.log(`Generated ${name}.png`);
}

// Filters
const filters = {
    'none': (r, g, b) => [r, g, b],
    'noir': (r, g, b) => {
        const avg = (r + g + b) / 3;
        return [avg, avg, avg];
    },
    'vintage': (r, g, b) => {
        const tr = (r * 0.393) + (g * 0.769) + (b * 0.189);
        const tg = (r * 0.349) + (g * 0.686) + (b * 0.168);
        const tb = (r * 0.272) + (g * 0.534) + (b * 0.131);
        return [Math.min(255, tr), Math.min(255, tg), Math.min(255, tb)];
    },
    'cool': (r, g, b) => [r, g, Math.min(255, b * 1.2)],
    'warm': (r, g, b) => [Math.min(255, r * 1.2), g, b],
    'cinematic': (r, g, b) => { // Teal & Orange-ish
        // very simple approximation
        const gray = (r + g + b) / 3;
        // Shadows shift to teal, Highlights shift to orange
        // This is complex to do per-pixel without better math, 
        // but let's try a simple S-curve contrast + tint
        let nr = r;
        let ng = g;
        let nb = b;
        
        // Boost contrast
        nr = (nr - 128) * 1.2 + 128;
        ng = (ng - 128) * 1.2 + 128;
        nb = (nb - 128) * 1.2 + 128;

        // Tint
        nr = nr * 1.1; // Orange push
        nb = nb * 0.9; // Teal push (less blue in shadows? actually teal is blue+green)
        
        return [Math.max(0, Math.min(255, nr)), Math.max(0, Math.min(255, ng)), Math.max(0, Math.min(255, nb))];
    }
};

// Main
Object.entries(filters).forEach(([name, cb]) => {
    try {
        createLUT(name, cb);
    } catch (e) {
        console.error(`Failed to generate ${name}:`, e);
    }
});
