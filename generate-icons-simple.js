#!/usr/bin/env node

/**
 * Simple icon generator for Docs to Kindle extension
 * Creates minimal placeholder PNG files without external dependencies
 *
 * Run with: node generate-icons-simple.js
 */

const fs = require('fs');
const path = require('path');

// Create a minimal solid-color PNG file
// This creates a simple PNG with Amazon's color scheme
function createMinimalPNG(size, r, g, b) {
    const width = size;
    const height = size;

    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk (image header)
    const ihdr = Buffer.concat([
        Buffer.from([0, 0, 0, 13]), // Chunk length
        Buffer.from('IHDR'), // Chunk type
        Buffer.from([
            (width >> 24) & 0xff, (width >> 16) & 0xff, (width >> 8) & 0xff, width & 0xff, // Width
            (height >> 24) & 0xff, (height >> 16) & 0xff, (height >> 8) & 0xff, height & 0xff, // Height
            8, // Bit depth
            2, // Color type (RGB)
            0, // Compression method
            0, // Filter method
            0  // Interlace method
        ])
    ]);
    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdr.slice(8)]));

    // IDAT chunk (image data)
    const pixelData = Buffer.alloc(height * (1 + width * 3)); // 1 byte filter + RGB for each pixel
    for (let y = 0; y < height; y++) {
        pixelData[y * (1 + width * 3)] = 0; // Filter type 0 (None)
        for (let x = 0; x < width; x++) {
            const offset = y * (1 + width * 3) + 1 + x * 3;
            pixelData[offset] = r;
            pixelData[offset + 1] = g;
            pixelData[offset + 2] = b;
        }
    }

    const zlib = require('zlib');
    const compressed = zlib.deflateSync(pixelData, { level: 9 });

    const idat = Buffer.concat([
        Buffer.from([
            (compressed.length >> 24) & 0xff,
            (compressed.length >> 16) & 0xff,
            (compressed.length >> 8) & 0xff,
            compressed.length & 0xff
        ]),
        Buffer.from('IDAT'),
        compressed
    ]);
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));

    // IEND chunk (image end)
    const iend = Buffer.concat([
        Buffer.from([0, 0, 0, 0]), // Chunk length
        Buffer.from('IEND')
    ]);
    const iendCrc = crc32(Buffer.from('IEND'));

    // Combine all chunks
    return Buffer.concat([
        signature,
        ihdr,
        ihdrCrc,
        idat,
        idatCrc,
        iend,
        iendCrc
    ]);
}

// CRC32 calculation for PNG chunks
function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    const result = (crc ^ -1) >>> 0;
    return Buffer.from([
        (result >> 24) & 0xff,
        (result >> 16) & 0xff,
        (result >> 8) & 0xff,
        result & 0xff
    ]);
}

// CRC lookup table
const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Amazon/Kindle orange: #FF9900 = rgb(255, 153, 0)
const colors = {
    orange: [255, 153, 0],
    dark: [35, 47, 62] // #232F3E
};

[16, 48, 128].forEach(size => {
    // Use orange for smaller sizes, dark for larger
    const [r, g, b] = size === 128 ? colors.dark : colors.orange;
    const png = createMinimalPNG(size, r, g, b);
    const filename = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filename, png);
    console.log(`✓ Created ${filename}`);
});

console.log('\nPlaceholder icons generated successfully!');
console.log('For production use, replace with proper designed icons.');
console.log('You can also use generate-icons.html in a browser for better icons.');
