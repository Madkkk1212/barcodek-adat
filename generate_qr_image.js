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
        const logoPath = path.join(__dirname, 'logo barcode.png');

        if (!fs.existsSync(logoPath)) {
            throw new Error(`Logo file not found at: ${logoPath}`);
        }

        console.log('Generating QR matrix...');
        const qr = QRCode.create(URL, { errorCorrectionLevel: 'H' });
        const modules = qr.modules;
        const N = modules.size;
        const cellSize = QR_SIZE / N;

        console.log(`Grid size: ${N}x${N}, Cell size: ${cellSize.toFixed(2)}px`);

        // Create a blank cream background
        const qrImg = new Jimp({ width: QR_SIZE, height: QR_SIZE, color: LIGHT_COLOR });

        // Load the brand logo
        const logoImg = await Jimp.read(logoPath);

        // Remove the white background from logo barcode.png to make it transparent
        console.log('Removing white background from brand logo to make it transparent...');
        for (let y = 0; y < logoImg.bitmap.height; y++) {
            for (let x = 0; x < logoImg.bitmap.width; x++) {
                const color = logoImg.getPixelColor(x, y);
                const r = (color >> 24) & 0xFF;
                const g = (color >> 16) & 0xFF;
                const b = (color >> 8) & 0xFF;

                // Threshold 230 for clean edges
                if (r > 230 && g > 230 && b > 230) {
                    logoImg.setPixelColor(0, x, y);
                }
            }
        }

        // Resize logo proportionally
        const maxLogoDimension = 450; // Perfect balance for embedded look
        const wOrig = logoImg.bitmap.width;
        const hOrig = logoImg.bitmap.height;
        const scale = Math.min(maxLogoDimension / wOrig, maxLogoDimension / hOrig);
        const logoW = Math.round(wOrig * scale);
        const logoH = Math.round(hOrig * scale);

        console.log(`Resizing logo to: ${logoW}x${logoH}px (Proportional)`);
        logoImg.resize({ w: logoW, h: logoH });

        // Centered position of logo inside the 2000px QR canvas
        const logoX = (QR_SIZE - logoW) / 2;
        const logoY = (QR_SIZE - logoH) / 2;

        // Silhouette overlap detector (checks if a canvas point is near any opaque pixel of the logo)
        function isNearLogoAlpha(cx, cy, padding) {
            const lx = Math.round(cx - logoX);
            const ly = Math.round(cy - logoY);

            // Bounding box for local search in logo space
            const startX = Math.max(0, lx - padding);
            const endX = Math.min(logoImg.bitmap.width - 1, lx + padding);
            const startY = Math.max(0, ly - padding);
            const endY = Math.min(logoImg.bitmap.height - 1, ly + padding);

            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const color = logoImg.getPixelColor(x, y);
                    const alpha = color & 0xFF; // extract alpha
                    if (alpha > 40) { // pixel is part of logo artwork
                        return true;
                    }
                }
            }
            return false;
        }

        // Draw rounded QR data modules with Silhouette-Masking
        console.log('Rendering rounded modules with silhouette-masking...');
        const skipPadding = 24; // 24px organic space around logo outlines

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

                    // Skip cells that overlap with the actual logo silhouette plus padding
                    if (isNearLogoAlpha(cx, cy, skipPadding)) {
                        continue;
                    }

                    // Draw as an elegant circular dot
                    const dotRadius = (cellSize / 2) * 0.85;
                    drawCircle(qrImg, cx, cy, dotRadius, DARK_COLOR);
                }
            }
        }

        // Draw the 3 premium concentric finders in Espresso & Gold
        console.log('Rendering premium concentric finders...');
        const finderCenters = [
            { cx: 3 * cellSize + cellSize / 2, cy: 3 * cellSize + cellSize / 2 },
            { cx: (N - 4) * cellSize + cellSize / 2, cy: 3 * cellSize + cellSize / 2 },
            { cx: 3 * cellSize + cellSize / 2, cy: (N - 4) * cellSize + cellSize / 2 }
        ];

        for (const center of finderCenters) {
            // Outer ring
            drawCircle(qrImg, center.cx, center.cy, cellSize * 3.3, GOLD_COLOR);
            // Inner cutout ring (cream background)
            drawCircle(qrImg, center.cx, center.cy, cellSize * 2.3, LIGHT_COLOR);
            // Center solid circle
            drawCircle(qrImg, center.cx, center.cy, cellSize * 1.3, DARK_COLOR);
        }

        // Composite the transparent brand logo in the exact center (sitting on top of the custom cutout)
        console.log('Compositing transparent logo directly onto the customized pattern...');
        qrImg.composite(logoImg, logoX, logoY);

        // Save the finished high-res embedded QR code
        await qrImg.write(finalQrPath);
        console.log(`Successfully generated and saved embedded premium QR code to: ${finalQrPath}`);

    } catch (err) {
        console.error('Error during QR Code generation:', err);
    }
}

run();
