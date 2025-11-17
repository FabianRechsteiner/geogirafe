import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60000,
    environment: 'jsdom',
    setupFiles: 'src/tools/tests/globalmocking.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**', 'buildtools/**']
    }
  }
});
