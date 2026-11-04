import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'frontend',

  base: '/new/build/',

  plugins: [{
    name: 'copy-rebunar-avatar-frames',
    closeBundle() {
      const source = resolve(projectRoot, 'frontend/assets/frames');
      const destination = resolve(projectRoot, 'frontend/build/assets/frames');
      mkdirSync(destination, { recursive: true });
      cpSync(source, destination, { recursive: true });
    }
  }],

  build: {
    outDir: 'build',
    emptyOutDir: true,
    cssMinify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
