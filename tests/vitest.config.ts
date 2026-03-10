import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 10_000,
    hookTimeout: 30_000,
    setupFiles: './src/setup.ts',
    sequence: { concurrent: false },
    // Run test files sequentially to avoid auth state conflicts
    fileParallelism: false,
  },
});
