import { defineConfig } from 'vite'

// https://v2.vitejs.dev/config/
export default defineConfig({
    root: './src',
    base: '/gg_viewer/',
    publicDir: './static',
    build: {
        outDir: '../public',
        emptyOutDir: true
    }
});
