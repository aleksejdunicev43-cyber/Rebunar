import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',

  base: '/new/build/',

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
