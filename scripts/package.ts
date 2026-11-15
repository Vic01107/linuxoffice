import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

function runCommand(command: string, args: string[], cwd: string = rootDir) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function main() {
  console.log('📦 Packaging LinuxOffice...');

  try {
    // Build first
    await runCommand('pnpm', ['run', 'build']);
    console.log('✅ Build completed');

    // Package with electron-builder
    await runCommand('npx', ['electron-builder', '--publish', 'never']);
    console.log('🎉 Packaging completed!');
  } catch (error) {
    console.error('❌ Packaging failed:', error);
    process.exit(1);
  }
}

main();