import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/tools/tests/globalmocking.ts',
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['buildtools', 'demo', 'public']
    }
  }
});
