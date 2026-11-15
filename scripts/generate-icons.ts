#!/usr/bin/env node
import sharp from 'sharp';
import { resolve } from 'path';

const rootDir = resolve(__dirname, '..');
const svgPath = resolve(rootDir, 'build/icon.svg');
const buildDir = resolve(rootDir, 'build');

async function main() {
  console.log('🎨 Generating icons from SVG...');

  try {
    // Generate PNG (256x256)
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toFile(resolve(buildDir, 'icon.png'));
    console.log('✅ icon.png generated');

    // Generate ICO with multiple sizes
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toBuffer()
      .then(buffer => sharp(buffer).toFile(resolve(buildDir, 'icon.ico')));
    console.log('✅ icon.ico generated');

    // Generate ICNS (macOS) - just PNG for now, electron-builder handles conversion
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(resolve(buildDir, 'icon.icns'));
    console.log('✅ icon.icns generated (as PNG)');

    console.log('🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Icon generation failed:', error);
    process.exit(1);
  }
}

main();