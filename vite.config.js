import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  base: '/new/build/',
  build: {
    target: 'chrome83',
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
