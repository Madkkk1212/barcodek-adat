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
        const logoPath = path.join(__dirname, 'logo.png');

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

        // Center card size is 22.5% of the QR Code size (450px for a 2000px QR Code)
        const logoCardSize = Math.round(QR_SIZE * 0.225);
        
        console.log(`Creating modern square card in center (size: ${logoCardSize}px) with elegant gold border...`);
        // Create a gold backing card
        const logoCard = new Jimp({ width: logoCardSize, height: logoCardSize, color: 0xC89B3CFF });
        
        // Create a cream inner card with a 6px gold border
        const borderWidth = 6;
        const innerCardSize = logoCardSize - (borderWidth * 2);
        const innerCard = new Jimp({ width: innerCardSize, height: innerCardSize, color: 0xFFF9F2FF });

        // Composite cream inner onto gold card
        logoCard.composite(innerCard, borderWidth, borderWidth);

        // RESIZE LOGO PROPORTIONALLY (ANTI-GEPENG / NO SQUASHING)
        // Set maximum dimension inside the card to 80% of the inner card size
        const maxLogoDimension = Math.round(innerCardSize * 0.85); 
        const wOrig = logoImg.bitmap.width;
        const hOrig = logoImg.bitmap.height;

        // Calculate scale factor maintaining the exact original aspect ratio
        const scale = Math.min(maxLogoDimension / wOrig, maxLogoDimension / hOrig);
        const logoW = Math.round(wOrig * scale);
        const logoH = Math.round(hOrig * scale);

        console.log(`Original logo dimension: ${wOrig}x${hOrig}px (Aspect Ratio: ${(wOrig/hOrig).toFixed(2)})`);
        console.log(`Proportional resized dimension (Anti-Gepeng): ${logoW}x${logoH}px`);

        // Perform clean proportional resize
        logoImg.resize({ w: logoW, h: logoH });

        // Center the proportionally resized logo inside the card
        const logoX = (logoCardSize - logoW) / 2;
        const logoY = (logoCardSize - logoH) / 2;
        logoCard.composite(logoImg, logoX, logoY);

        // Composite the finished center logo card onto the exact center of the standard QR Code
        const cardX = (QR_SIZE - logoCardSize) / 2;
        const cardY = (QR_SIZE - logoCardSize) / 2;
        qrImg.composite(logoCard, cardX, cardY);

        // Save final high-res branded QR code
        await qrImg.write(finalQrPath);
        console.log(`Successfully generated and saved premium classic QR code to: ${finalQrPath}`);

        // Clean up temp file
        if (fs.existsSync(tempQrPath)) {
            fs.unlinkSync(tempQrPath);
        }
    } catch (err) {
        console.error('Error during QR Code generation:', err);
    }
}

run();
