import { defineConfig } from 'vite';

import InlineTemplatesPlugin from './buildtools/vite-inline-templates-plugin';
import RestartPlugin from './buildtools/vite-restart-plugin';

// https://v2.vitejs.dev/config/
export default defineConfig({
  root: './src',
  base: './',
  publicDir: './static',
  build: {
    outDir: '../public',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lazy: ['gridjs', 'vanilla-picker', 'adjectives', 'tippy.js']
        }
      }
      //external: ['cesium']
    }
  },
  optimizeDeps: {
    include: ['cesium', 'olcs/OLCesium']
  },
  plugins: [InlineTemplatesPlugin(), RestartPlugin()]
});
