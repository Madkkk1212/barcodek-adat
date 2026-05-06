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

                // If the pixel is white or very close to white, make it fully transparent
                if (r > 240 && g > 240 && b > 240) {
                    logoImg.setPixelColor(0, x, y);
                }
            }
        }

        // RESIZE LOGO PROPORTIONALLY (ANTI-GEPENG / NO SQUASHING)
        // Set maximum dimension inside the card to 580px (Larger Logo!)
        const maxLogoDimension = 580;
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

        // Create a borderless, seamless card of background color to act as a cutout quiet zone
        // This makes the cutout invisible so the logo merges organically directly into the barcode
        const padding = 24; // clean breathing room from modules
        const cutoutW = logoW + (padding * 2);
        const cutoutH = logoH + (padding * 2);
        console.log(`Creating borderless blending card in center (cutout size: ${cutoutW}x${cutoutH}px)...`);
        
        const logoCard = new Jimp({ width: cutoutW, height: cutoutH, color: 0xFFF9F2FF });

        // Center the proportionally resized logo inside the borderless cutout card
        logoCard.composite(logoImg, padding, padding);

        // Composite the finished borderless logo card onto the exact center of the standard QR Code
        const cardX = (QR_SIZE - cutoutW) / 2;
        const cardY = (QR_SIZE - cutoutH) / 2;
        qrImg.composite(logoCard, cardX, cardY);

        // Save final high-res branded QR code
        await qrImg.write(finalQrPath);
        console.log(`Successfully generated and saved premium classic borderless QR code to: ${finalQrPath}`);

        // Clean up temp file
        if (fs.existsSync(tempQrPath)) {
            fs.unlinkSync(tempQrPath);
        }
    } catch (err) {
        console.error('Error during QR Code generation:', err);
    }
}

run();
