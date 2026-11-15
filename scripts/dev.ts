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
      env: { ...process.env, NODE_ENV: 'development' },
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function main() {
  console.log('🚀 Starting LinuxOffice development environment...');

  try {
    // Start Vite dev server and Electron concurrently
    await Promise.all([
      runCommand('pnpm', ['--filter', '@linuxoffice/renderer', 'dev']),
      runCommand('pnpm', ['--filter', '@linuxoffice/main', 'build']),
    ]);
  } catch (error) {
    console.error('❌ Development server failed:', error);
    process.exit(1);
  }
}

main();