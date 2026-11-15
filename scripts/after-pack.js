// after-pack.js - Disable code signing for local builds
// This script runs after electron-builder packs the app

module.exports = async function(context) {
  // Skip code signing on Windows for local builds
  if (process.platform === 'win32' && !process.env.CSC_LINK) {
    console.log('Skipping code signing for local build...');
  }
};