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

        console.log('Generating base QR code...');
        await QRCode.toFile(tempQrPath, URL, {
            width: QR_SIZE,
            margin: 4,
            errorCorrectionLevel: 'H',
            color: {
                dark: DARK_COLOR,
                light: LIGHT_COLOR
            }
        });

        console.log('Base QR code generated. Processing images...');
        const qrImg = await Jimp.read(tempQrPath);
        const logoImg = await Jimp.read(logoPath);

        // Logo-card size is 22.5% of QR Code size (450px for a 2000px QR Code)
        const logoCardSize = Math.round(QR_SIZE * 0.225);
        // Inside padding is 12% of logo-card size
        const padding = Math.round(logoCardSize * 0.12);
        const logoSize = logoCardSize - (padding * 2);

        console.log(`Logo-card size: ${logoCardSize}px, Logo size: ${logoSize}px`);

        // Create a gold card background (450x450px)
        const logoCard = new Jimp({ width: logoCardSize, height: logoCardSize, color: 0xC89B3CFF });
        
        // Create a white inner card with a 6px border
        const borderWidth = 6;
        const innerCardSize = logoCardSize - (borderWidth * 2);
        const innerCard = new Jimp({ width: innerCardSize, height: innerCardSize, color: 0xFFFFFFFF });

        // Composite white card onto gold card
        logoCard.composite(innerCard, borderWidth, borderWidth);

        // Resize brand logo to fit inside the padding
        logoImg.resize({ w: logoSize, h: logoSize });

        // Composite resized logo onto the center of the logo card
        logoCard.composite(logoImg, padding, padding);

        // Composite the finished logo card onto the exact center of the QR Code
        const cardX = (QR_SIZE - logoCardSize) / 2;
        const cardY = (QR_SIZE - logoCardSize) / 2;
        qrImg.composite(logoCard, cardX, cardY);

        // Save final result
        await qrImg.write(finalQrPath);
        console.log(`Successfully generated and saved branded QR code to: ${finalQrPath}`);

        // Clean up temp file
        if (fs.existsSync(tempQrPath)) {
            fs.unlinkSync(tempQrPath);
        }
    } catch (err) {
        console.error('Error during QR Code generation:', err);
    }
}

run();
