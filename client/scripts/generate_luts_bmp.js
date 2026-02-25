
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const WIDTH = 512;
const HEIGHT = 512;
const TILE_SIZE = 64;

function createBMP(width, height) {
    const headerSize = 54;
    const dataSize = width * height * 3; // RGB
    const fileSize = headerSize + dataSize;
    const buffer = Buffer.alloc(fileSize);

    // Bitmap File Header
    buffer.write('BM', 0);
    buffer.writeUInt32LE(fileSize, 2);
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize, 10);

    // DIB Header (BITMAPINFOHEADER)
    buffer.writeUInt32LE(40, 14); // Header size
    buffer.writeInt32LE(width, 18);
    // Positive height = Bottom-Up (Standard BMP)
    buffer.writeInt32LE(height, 22); 
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // BPP (RGB)
    buffer.writeUInt32LE(0, 30); // Compression (BI_RGB)
    buffer.writeUInt32LE(dataSize, 34);
    buffer.writeInt32LE(2835, 38); // H res
    buffer.writeInt32LE(2835, 42); // V res
    buffer.writeUInt32LE(0, 46); // Colors used
    buffer.writeUInt32LE(0, 50); // Important colors

    return buffer;
}

function generateLUT(name, cb) {
    const buffer = createBMP(WIDTH, HEIGHT);
    let offset = 54; // BMP Data Offset

    // Generate pixels for Bottom-Up BMP.
    // Row 0 in file = Bottom row of image.
    // gl.texImage2D loads Row 0 to V=0 (Bottom).
    // So y=0 in loop matches V=0 in shader.
    
    // Shader Logic:
    // v_texCoord varies 0..1 (Bottom..Top).
    // blue=0 -> quad1.y=0 -> texPos1.y ~ 0 (Bottom).
    // green=0 -> texPos1.y offset ~ 0 (Bottom relative to tile).
    
    // So we want:
    // y=0 in loop (Bottom) -> tileY=0, green=0.
    
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            
            // 1. Identify which Tile based on y (0..511)
            // y=0 is Bottom. Tile 0 should be at Bottom.
            const tileX = Math.floor(x / TILE_SIZE);
            const tileY = Math.floor(y / TILE_SIZE);
            
            // 2. Identify coordinates inside the tile
            const redRaw = x % TILE_SIZE;   // r varies with x
            const greenRaw = y % TILE_SIZE; // g varies with y
            
            // 3. Identify Blue value based on Tile Index
            // tileY=0 -> Bottom Row of Tiles -> Blue=0..7
            const blueRaw = tileY * 8 + tileX;
            
            // 4. Normalize
            const r = Math.floor(redRaw * (255 / 63));
            const g = Math.floor(greenRaw * (255 / 63));
            const b = Math.floor(blueRaw * (255 / 63));

            // 5. Apply Filter
            const [fr, fg, fb] = cb(r, g, b);

            // 6. Write Pixel (BGR)
            buffer.writeUInt8(Math.max(0, Math.min(255, Math.floor(fb))), offset++);
            buffer.writeUInt8(Math.max(0, Math.min(255, Math.floor(fg))), offset++);
            buffer.writeUInt8(Math.max(0, Math.min(255, Math.floor(fr))), offset++);
        }
    }

    fs.writeFileSync(path.join('public', 'luts', `${name}.bmp`), buffer);
    console.log(`Generated ${name}.bmp`);
}

// Filters
const filters = {
    'none': (r, g, b) => [r, g, b],
    'noir': (r, g, b) => {
        const avg = (r + g + b) / 3;
        const v = (avg - 128) * 1.5 + 128;
        return [v, v, v];
    },
    'vintage': (r, g, b) => {
        const tr = (r * 0.393) + (g * 0.769) + (b * 0.189);
        const tg = (r * 0.349) + (g * 0.686) + (b * 0.168);
        const tb = (r * 0.272) + (g * 0.534) + (b * 0.131);
        return [tr, tg, tb];
    },
    'cool': (r, g, b) => [r, g, b * 1.5],
    'warm': (r, g, b) => [r * 1.2, g * 1.1, b * 0.9],
    'cinematic': (r, g, b) => { 
        const gray = (r + g + b) / 3;
        let nr = r, ng = g, nb = b;
        if (gray < 128) {
             nb += (128 - gray) * 0.5;
             ng += (128 - gray) * 0.1;
             nr -= (128 - gray) * 0.2;
        } else {
             nr += (gray - 128) * 0.5;
             ng += (gray - 128) * 0.1;
             nb -= (gray - 128) * 0.2;
        }
         nr = (nr - 128) * 1.1 + 128;
         ng = (ng - 128) * 1.1 + 128;
         nb = (nb - 128) * 1.1 + 128;
         return [nr, ng, nb];
    }
};

const lutDir = path.join('public', 'luts');
if (!fs.existsSync(lutDir)) {
    fs.mkdirSync(lutDir, { recursive: true });
}

Object.entries(filters).forEach(([name, cb]) => {
    try {
        generateLUT(name, cb);
    } catch (e) {
        console.error(`Failed to generate ${name}:`, e);
    }
});
