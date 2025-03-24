import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

import InlineTemplatesPlugin from './buildtools/vite-inline-templates-plugin';
import HtmlRebuildPlugin from './buildtools/vite-restart-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import dns from 'dns';

/**
 * Custom name resolution for app.localhost:
 * Vite try to do a DNS-Lookup when starting the dev server
 * and app.localhost is not defined anywhere.
 * We do not want to define on each client,
 * so the default dns lookup method is overriden
 * to resolve app.localhost to 127.0.0.1
 */
const originalDnsLookup = dns.lookup;
function customDnsLookup(hostname, arg1, arg2) {
  const callback = typeof arg1 === 'function' ? arg1 : arg2;
  const options = typeof arg1 === 'function' ? undefined : arg1;
  if (hostname === 'app.localhost') {
    callback(null, '127.0.0.1', 4);
  } else {
    originalDnsLookup(hostname, options, callback);
  }
}
dns.lookup = customDnsLookup;

// This is the base url for static files that CesiumJS needs to load.
// Set to an empty string to place the files at the site's root path
const cesiumSource = 'node_modules/cesium/Build/Cesium';
// Default configuration for Cesium (see https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)
const cesiumBaseUrl = 'lib/cesium/';

// Default prefix. Must be 'src' when working locally on the gg-viewer project
// Will be automatically set to the library path when working with the library @geogirafe/lib-geoportal
const geogirafeSource = 'src';

// https://v2.vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    base: './',
    server: {
      host: 'app.localhost',
      port: 8080,
      strictPort: true,
      https:
        command === 'serve'
          ? {
              key: readFileSync('buildtools/certs/app.localhost.key.pem'),
              cert: readFileSync('buildtools/certs/app.localhost.cert.pem')
            }
          : false
    },
    build: {
      outDir: 'dist/app',
      sourcemap: true,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          desktop: resolve(__dirname, 'index.html'),
          mobile: resolve(__dirname, 'mobile.html'),
          iframe: resolve(__dirname, 'iframe.html')
        },
        output: {
          manualChunks: {
            lazy: [
              '@geoblocks/mapfishprint',
              '@geoblocks/print',
              'buffer',
              'd3',
              'error-stack-parser',
              'file-saver',
              'tabulator-tables',
              'lz-string',
              'source-map-js',
              'tippy.js',
              'vanilla-picker'
            ]
          }
        }
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
          { src: `${geogirafeSource}/service-worker.js`, dest: '' },
          { src: `${geogirafeSource}/styles/*.css`, dest: 'styles/' },
          { src: `${geogirafeSource}/assets/*`, dest: '' },
          { src: 'node_modules/ol/ol.css', dest: 'lib/ol/' },
          { src: 'node_modules/tabulator-tables/dist/css/tabulator.min.css', dest: 'lib/tabulator-tables/' },
          { src: 'node_modules/tippy.js/dist/*.css', dest: 'lib/tippy.js/' },
          { src: 'node_modules/vanilla-picker/dist/*.css', dest: 'lib/vanilla-picker/' }
        ]
      }),
      InlineTemplatesPlugin(),
      HtmlRebuildPlugin()
    ],
    define: {
      // Define relative base path in cesium for loading assets
      // https://vitejs.dev/config/shared-options.html#define
      CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl)
    }
  };
});
