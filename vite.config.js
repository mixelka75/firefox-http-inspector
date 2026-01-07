import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy extension files after build
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      const filesToCopy = ['manifest.json', 'background.js', 'content.js'];
      for (const file of filesToCopy) {
        const src = resolve(__dirname, file);
        const dest = resolve(__dirname, 'dist', file);
        if (existsSync(src)) {
          copyFileSync(src, dest);
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        logs: resolve(__dirname, 'logs.html'),
        popup: resolve(__dirname, 'popup.html')
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true
  },
  // Для dev режима
  server: {
    port: 5173,
    strictPort: true
  }
});
