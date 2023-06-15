import { defineConfig } from 'vite'

// https://v2.vitejs.dev/config/
export default defineConfig({
    root: './src',
    base: './',
    publicDir: './static',
    build: {
        outDir: '../public',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    lazy: ['gridjs', 'vanilla-picker', 'adjectives', 'tippy.js']
                }
            }
        }
    }
});
