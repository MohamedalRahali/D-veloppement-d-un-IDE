import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  cacheDir: '.vite',
  optimizeDeps: {
    include: []
  },
  clearScreen: false,
  logLevel: 'info'
});
