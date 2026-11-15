import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@linuxoffice/shared': resolve(__dirname, '../../shared/src'),
            '@linuxoffice/main': resolve(__dirname, '../../main/src'),
            '@linuxoffice/renderer': resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
            },
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
});
//# sourceMappingURL=vite.config.js.map