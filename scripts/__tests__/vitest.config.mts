import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Config for the workspace-level lock tests under scripts/__tests__/.
 *
 * Mirrors the per-plugin configs' devkit alias so the oxlint-export lock can
 * import every plugin's src/oxlint.ts without a pre-built
 * @interlace/eslint-devkit dist. Run from the repo root:
 *
 *   npm run test:oxlint-exports
 */
export default defineConfig({
  resolve: {
    alias: {
      '@interlace/eslint-devkit': resolve(
        __dirname,
        '../../packages/eslint-devkit/src/index.ts',
      ),
    },
  },
  root: resolve(__dirname, '../..'),
  test: {
    environment: 'node',
    watch: false,
    include: ['scripts/__tests__/**/*.test.ts'],
    pool: 'vmThreads',
  },
});
