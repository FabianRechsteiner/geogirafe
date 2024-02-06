import { defineConfig } from 'vite';

import InlineTemplatesPlugin from './buildtools/vite-inline-templates-plugin';
import RestartPlugin from './buildtools/vite-restart-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const cesiumSource = 'node_modules/cesium/Build/Cesium';
// This is the base url for static files that CesiumJS needs to load.
// Set to an empty string to place the files at the site's root path

// Default configuration for Cesium (see https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)
const cesiumBaseUrl = 'lib/cesium/';

// https://v2.vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist/app',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lazy: ['gridjs', 'vanilla-picker', 'adjectives', 'tippy.js']
        }
      },
      external: ['cesium']
    }
  },
  optimizeDeps: {
    include: ['cesium', 'olcs/OLCesium']
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
        { src: 'node_modules/ol/ol.css', dest: 'lib/ol/' },
        { src: 'node_modules/gridjs/dist/theme/mermaid.min.css', dest: 'lib/gridjs/' },
        { src: 'node_modules/font-gis/css/*.css', dest: 'lib/font-gis/' },
        { src: 'node_modules/font-gis/fonts/*', dest: 'lib/font-gis/' },
        { src: 'node_modules/tippy.js/dist/*.css', dest: 'lib/tippy.js/' },
        { src: 'node_modules/vanilla-picker/dist/*.css', dest: 'lib/vanilla-picker/' }
      ]
    }),
    InlineTemplatesPlugin(),
    RestartPlugin()
  ],
  define: {
    // Define relative base path in cesium for loading assets
    // https://vitejs.dev/config/shared-options.html#define
    CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl)
  }
});
