const sharp = require('/tmp/og-image-gen/node_modules/sharp');
const fs = require('fs');

async function generateOG() {
  const bgPath = '/Users/yanaiedri/.gemini/antigravity-ide/brain/ab154fb0-afc5-4b17-a651-9a0ff064316d/.user_uploaded/media_1791135306206.jpg';
  const dashboardPath = '/Users/yanaiedri/.gemini/antigravity-ide/brain/ab154fb0-afc5-4b17-a651-9a0ff064316d/.user_uploaded/media_1791135435122.png';
  const logoPath = '/Users/yanaiedri/projects/BuildPro/my-tanstack-app/public/logo.png';

  const width = 1200;
  const height = 630;

  try {
    const bgBuffer = await sharp(bgPath)
      .resize(width, height, { fit: 'cover', position: 'top' }) // Focus on the nice sky/top part
      .modulate({ brightness: 0.6 }) // darken to let UI pop
      .toBuffer();

    // Dashboard
    const dashWidth = 900; // fit perfectly
    const dashBuffer = await sharp(dashboardPath)
      .resize(dashWidth, null)
      .toBuffer();

    // Logo
    const logoWidth = 240;
    const logoBuffer = await sharp(logoPath)
      .resize(logoWidth, null)
      .toBuffer();

    await sharp(bgBuffer)
      .composite([
        { input: dashBuffer, top: 180, left: Math.floor((width - dashWidth) / 2) },
        { input: logoBuffer, top: 50, left: 50 }
      ])
      .toFile('/Users/yanaiedri/projects/BuildPro/my-tanstack-app/public/og-image.png');

    console.log("Successfully generated og-image.png!");
  } catch (err) {
    console.error("Error generating image:", err);
  }
}

generateOG();
