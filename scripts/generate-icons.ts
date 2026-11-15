#!/usr/bin/env node
import sharp from 'sharp';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const rootDir = resolve(__dirname, '..');
const svgPath = resolve(rootDir, 'build/icon.svg');
const buildDir = resolve(rootDir, 'build');

// ICO file format helper - creates a proper ICO with multiple sizes
async function generateIco(svgPath: string, outputPath: string) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers: Buffer[] = [];

  for (const size of sizes) {
    const buffer = await sharp(svgPath)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(buffer);
  }

  // Build ICO file
  // ICO header: 6 bytes
  // ICONDIR: 6 bytes (reserved=0, type=1 for ICO, count=number of images)
  // ICONDIRENTRY: 16 bytes per image
  // Image data follows

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type (1 = ICO)
  header.writeUInt16LE(sizes.length, 4); // Count

  const entries: Buffer[] = [];
  let offset = 6 + sizes.length * 16; // Header + directory entries

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const pngBuffer = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // Width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // Height (0 = 256)
    entry.writeUInt8(0, 2); // Color count (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    entries.push(entry);
    offset += pngBuffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...pngBuffers]);
  writeFileSync(outputPath, icoBuffer);
}

async function main() {
  console.log('🎨 Generating icons from SVG...');

  try {
    // Generate PNG (256x256)
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toFile(resolve(buildDir, 'icon.png'));
    console.log('✅ icon.png generated');

    // Generate proper ICO with multiple sizes
    await generateIco(svgPath, resolve(buildDir, 'icon.ico'));
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