import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const sizes = [192, 512];
const iconPath = path.join(process.cwd(), 'public', 'icon.svg');
const outputDir = path.join(process.cwd(), 'public');

async function generatePWAIcons() {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Generate icons for each size
    for (const size of sizes) {
      await sharp(iconPath)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `pwa-${size}x${size}.png`));
      
      console.log(`Generated ${size}x${size} icon`);
    }

    console.log('PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating PWA icons:', error);
    process.exit(1);
  }
}

generatePWAIcons(); 