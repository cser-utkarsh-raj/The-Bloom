import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 2026,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['phaser']
  }
});