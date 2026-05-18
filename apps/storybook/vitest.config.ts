import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    watch: false,
    include: ['src/__tests__/**/*.test.ts'],
    passWithNoTests: true,
    name: 'storybook',
    reporters: ['default'],
  },
});
