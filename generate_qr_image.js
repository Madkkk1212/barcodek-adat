const QRCode = require('qrcode');
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const URL = "https://barcodek-adat.vercel.app/";
const QR_SIZE = 2000;
const DARK_COLOR = '#24140B';
const LIGHT_COLOR = '#FFF9F2';

async function run() {
    try {
        const tempQrPath = path.join(__dirname, 'temp_qr.png');
        const finalQrPath = path.join(__dirname, 'qrcode.png');
        const logoPath = path.join(__dirname, 'logo barcode.png');

        if (!fs.existsSync(logoPath)) {
            throw new Error(`Logo file not found at: ${logoPath}`);
        }

        console.log('Generating base standard QR code (clean square modules)...');
        // We use standard clean QR modules for 100% scan compatibility and high-end geometric layout
        await QRCode.toFile(tempQrPath, URL, {
            width: QR_SIZE,
            margin: 4,
            errorCorrectionLevel: 'H',
            color: {
                dark: DARK_COLOR,
                light: LIGHT_COLOR
            }
        });

        console.log('Loading generated base QR and brand logo...');
        const qrImg = await Jimp.read(tempQrPath);
        const logoImg = await Jimp.read(logoPath);

        // REMOVE WHITE BACKGROUND FROM LOGO AUTOMATICALLY
        console.log('Removing white background from brand logo to make it transparent...');
        for (let y = 0; y < logoImg.bitmap.height; y++) {
            for (let x = 0; x < logoImg.bitmap.width; x++) {
                const color = logoImg.getPixelColor(x, y);
                const r = (color >> 24) & 0xFF;
                const g = (color >> 16) & 0xFF;
                const b = (color >> 8) & 0xFF;

                // If the pixel is white or very close to white, make it fully transparent (Threshold 230 for clean edges)
                if (r > 230 && g > 230 && b > 230) {
                    logoImg.setPixelColor(0, x, y);
                }
            }
        }

        // RESIZE LOGO PROPORTIONALLY (ANTI-GEPENG / NO SQUASHING)
        // Set maximum dimension inside the card to 440px for perfect scannability and float look
        const maxLogoDimension = 440;
        const wOrig = logoImg.bitmap.width;
        const hOrig = logoImg.bitmap.height;

        // Calculate scale factor maintaining the exact original aspect ratio
        const scale = Math.min(maxLogoDimension / wOrig, maxLogoDimension / hOrig);
        const logoW = Math.round(wOrig * scale);
        const logoH = Math.round(hOrig * scale);

        console.log(`Original logo dimension: ${wOrig}x${hOrig}px (Aspect Ratio: ${(wOrig / hOrig).toFixed(2)})`);
        console.log(`Proportional resized dimension (Anti-Gepeng): ${logoW}x${logoH}px`);

        // Perform clean proportional resize
        logoImg.resize({ w: logoW, h: logoH });

        // COMPOSITE TRANSPARENT LOGO DIRECTLY ONTO QR CODE
        // No backing card, no white box, and no empty cutout space! 
        // The logo floats seamlessly and organically directly over the QR modules
        console.log('Compositing transparent logo directly onto the QR code...');
        const logoX = (QR_SIZE - logoW) / 2;
        const logoY = (QR_SIZE - logoH) / 2;
        qrImg.composite(logoImg, logoX, logoY);

        // Save final high-res branded QR code
        await qrImg.write(finalQrPath);
        console.log(`Successfully generated and saved premium classic seamless floating QR code to: ${finalQrPath}`);

        // Clean up temp file
        if (fs.existsSync(tempQrPath)) {
            fs.unlinkSync(tempQrPath);
        }
    } catch (err) {
        console.error('Error during QR Code generation:', err);
    }
}

run();
