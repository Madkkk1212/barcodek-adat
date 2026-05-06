const QRCode = require('qrcode');
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const URL = "https://barcodek-adat.vercel.app/";
const QR_SIZE = 2000;
const DARK_COLOR = 0x24140BFF; // Espresso
const LIGHT_COLOR = 0xFFF9F2FF; // Warm Cream
const GOLD_COLOR = 0xC89B3CFF; // Gold

// Helper to draw a solid circle
function drawCircle(image, cx, cy, r, color) {
    const rSquared = r * r;
    const startX = Math.max(0, Math.floor(cx - r));
    const endX = Math.min(image.bitmap.width - 1, Math.ceil(cx + r));
    const startY = Math.max(0, Math.floor(cy - r));
    const endY = Math.min(image.bitmap.height - 1, Math.ceil(cy + r));

    for (let y = startY; y <= endY; y++) {
        const dy = y - cy;
        const dySquared = dy * dy;
        for (let x = startX; x <= endX; x++) {
            const dx = x - cx;
            if (dx * dx + dySquared <= rSquared) {
                image.setPixelColor(color, x, y);
            }
        }
    }
}

async function run() {
    try {
        const finalQrPath = path.join(__dirname, 'qrcode.png');
        const logoPath = path.join(__dirname, 'luxury_logo.png');

        if (!fs.existsSync(logoPath)) {
            throw new Error(`Luxury logo file not found at: ${logoPath}`);
        }

        console.log('Generating QR matrix...');
        const qr = QRCode.create(URL, { errorCorrectionLevel: 'H' });
        const modules = qr.modules;
        const N = modules.size;
        const cellSize = QR_SIZE / N;

        console.log(`Grid size: ${N}x${N}, Cell size: ${cellSize.toFixed(2)}px`);

        // Create a blank cream background
        const qrImg = new Jimp({ width: QR_SIZE, height: QR_SIZE, color: LIGHT_COLOR });

        // Center of the QR Code
        const centerX = QR_SIZE / 2;
        const centerY = QR_SIZE / 2;
        const exclusionRadius = 290; // Center circle cutout for logo

        // Draw data modules
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                // Skip the three large corner finders (7x7 blocks)
                if (r < 7 && c < 7) continue;
                if (r < 7 && c >= N - 7) continue;
                if (r >= N - 7 && c < 7) continue;

                // Check if the cell is dark
                if (modules.get(r, c)) {
                    const cx = c * cellSize + cellSize / 2;
                    const cy = r * cellSize + cellSize / 2;

                    // Skip cells inside the center exclusion circle to leave room for the logo
                    const dx = cx - centerX;
                    const dy = cy - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < exclusionRadius + 15) {
                        continue;
                    }

                    // Draw as an elegant circular dot
                    // We draw it slightly smaller than cellSize (e.g. 82% of cell half-width) to create stunning clean spacing
                    const dotRadius = (cellSize / 2) * 0.82;
                    drawCircle(qrImg, cx, cy, dotRadius, DARK_COLOR);
                }
            }
        }

        // Draw the 3 premium concentric finders
        const finderCenters = [
            { cx: 3 * cellSize + cellSize / 2, cy: 3 * cellSize + cellSize / 2 },
            { cx: (N - 4) * cellSize + cellSize / 2, cy: 3 * cellSize + cellSize / 2 },
            { cx: 3 * cellSize + cellSize / 2, cy: (N - 4) * cellSize + cellSize / 2 }
        ];

        for (const center of finderCenters) {
            // Outer ring of radius 3.2 cells
            drawCircle(qrImg, center.cx, center.cy, cellSize * 3.2, GOLD_COLOR);
            // Inner cutout ring of radius 2.2 cells (back to background color)
            drawCircle(qrImg, center.cx, center.cy, cellSize * 2.2, LIGHT_COLOR);
            // Center solid circle of radius 1.4 cells
            drawCircle(qrImg, center.cx, center.cy, cellSize * 1.4, DARK_COLOR);
        }

        console.log('Processing center luxury emblem card...');
        // Draw the perfect circular logo card in the center of the QR
        // Circular gold rim
        drawCircle(qrImg, centerX, centerY, exclusionRadius, GOLD_COLOR);
        // Inner white/cream circle
        drawCircle(qrImg, centerX, centerY, exclusionRadius - 6, LIGHT_COLOR);

        // Load the generated luxury gold logo
        const logoImg = await Jimp.read(logoPath);

        // Remove the black background from luxury_logo.png to make it transparent
        console.log('Making logo background transparent...');
        for (let y = 0; y < logoImg.bitmap.height; y++) {
            for (let x = 0; x < logoImg.bitmap.width; x++) {
                const color = logoImg.getPixelColor(x, y);
                // Extract channels
                const r = (color >> 24) & 0xFF;
                const g = (color >> 16) & 0xFF;
                const b = (color >> 8) & 0xFF;

                // If pixel is dark background, make it transparent
                if (r < 50 && g < 50 && b < 50) {
                    logoImg.setPixelColor(0, x, y);
                }
            }
        }

        // Resize transparent luxury logo
        const logoSize = Math.round(exclusionRadius * 1.35); // 390px
        console.log(`Resizing logo to: ${logoSize}px`);
        logoImg.resize({ w: logoSize, h: logoSize });

        // Composite logo in the exact center of our QR code
        const logoX = centerX - logoSize / 2;
        const logoY = centerY - logoSize / 2;
        qrImg.composite(logoImg, logoX, logoY);

        // Save the finished high-res premium abstract barcode
        await qrImg.write(finalQrPath);
        console.log(`Successfully generated and saved abstract premium QR code to: ${finalQrPath}`);

    } catch (err) {
        console.error('Error during QR Code generation:', err);
    }
}

run();
