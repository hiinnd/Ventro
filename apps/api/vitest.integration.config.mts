import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.integration.ts'],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
