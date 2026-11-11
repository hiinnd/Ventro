import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'true',
      WEB_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
    },
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
