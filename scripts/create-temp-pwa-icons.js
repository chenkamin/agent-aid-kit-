/**
 * Temporary PWA Icon Creator
 * Creates simple placeholder icons for PWA testing
 * Replace these with professional icons in production!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG template for icons
const createSVG = (size, isMaskable = false) => {
  const padding = isMaskable ? size * 0.1 : 0;
  const innerSize = size - (padding * 2);
  const innerPos = padding;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${isMaskable ? '#2563eb' : 'transparent'}"/>
  <rect x="${innerPos}" y="${innerPos}" width="${innerSize}" height="${innerSize}" rx="${innerSize * 0.15}" fill="${isMaskable ? '#ffffff' : '#2563eb'}"/>
  <text x="${size / 2}" y="${size / 2}" font-family="Arial, sans-serif" font-weight="bold" font-size="${innerSize * 0.4}" fill="${isMaskable ? '#2563eb' : '#ffffff'}" text-anchor="middle" dominant-baseline="central">D</text>
  ${!isMaskable ? `<path d="M ${size * 0.3} ${size * 0.7} L ${size * 0.45} ${size * 0.85} L ${size * 0.7} ${size * 0.6}" stroke="${'#ffffff'}" stroke-width="${size * 0.05}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
</svg>`;
};

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
const icons = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-192x192.png', size: 192, maskable: true },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
];

console.log('🎨 Creating temporary PWA icons...\n');

icons.forEach(({ name, size, maskable }) => {
  const svg = createSVG(size, maskable);
  const svgPath = path.join(publicDir, name.replace('.png', '.svg'));
  
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Created ${name.replace('.png', '.svg')}`);
});

console.log(`
✅ Temporary icon files created!

📝 Note: SVG files created instead of PNG for simplicity.
   For production, use proper PNG icons from:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/

📁 Location: /public directory
`);

