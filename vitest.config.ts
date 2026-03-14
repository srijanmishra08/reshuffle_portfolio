import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    testTimeout: 180000,        // 3 min per test (downloads can be slow)
    hookTimeout: 60000,         // 1 min for hooks
    pool: 'forks',              // Isolate tests with subprocess forks
    reporters: ['verbose'],
    sequence: {
      concurrent: false,        // Run test files sequentially (network-bound)
    },
  },
});
