import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { existsSync, readdirSync } from 'node:fs';

/**
 * Config for the workspace-level lock tests under scripts/__tests__/.
 *
 * Mirrors the per-plugin configs' devkit alias so the oxlint-export lock can
 * import every plugin's src/oxlint.ts without a pre-built
 * @interlace/eslint-devkit dist. Run from the repo root:
 *
 *   npm run test:oxlint-exports
 */

const PACKAGES_DIR = resolve(__dirname, '../../packages');

/**
 * Alias every workspace plugin to its TS source.
 *
 * Each plugin's `package.json#main` points into `dist/`, which only exists
 * after a build; `npm run test:scripts` runs in a job with no build step, so
 * an unaliased `import 'eslint-plugin-x'` fails the whole file at collection.
 * Aliasing to source is also what the locks want semantically — they exist to
 * catch a regression in the source, before it is ever built or published.
 *
 * Derived from the filesystem rather than a hand-kept list: the list this
 * replaces (in the deleted eslint-config-interlace/vitest.config.mts) drifted
 * twice — once when the 7 ORM plugins landed, once for the renamed pg/jwt
 * pair — and each time the symptom was a collection-time failure far from the
 * cause. A new plugin is covered the moment its directory exists. Third-party
 * `eslint-plugin-*` packages (oxlint, unicorn) are untouched: they have no
 * directory here, so they keep resolving through node_modules.
 */
const PLUGIN_ALIASES = Object.fromEntries(
  readdirSync(PACKAGES_DIR)
    .filter((dir) => dir.startsWith('eslint-plugin-'))
    .map((dir) => [dir, resolve(PACKAGES_DIR, dir, 'src/index.ts')] as const)
    .filter(([, source]) => existsSync(source)),
);

export default defineConfig({
  resolve: {
    alias: {
      ...PLUGIN_ALIASES,
      '@interlace/eslint-devkit': resolve(
        __dirname,
        '../../packages/eslint-devkit/src/index.ts',
      ),
    },
  },
  root: resolve(__dirname, '../..'),
  test: {
    // Repo-wide floor: pre-push runs 47 turbo tasks concurrently, so I/O-bound
    // tests are routinely starved. Vitest's 5s default is tuned for unit tests on
    // an idle machine and mis-reports contention as failure. A hang still fails,
    // just at 30s instead of 5s.
    testTimeout: 30_000,
    // Same rationale as testTimeout above, for setup/teardown: hookTimeout
    // defaults to 10s and is NOT covered by testTimeout, so a beforeAll/afterEach
    // starved by the parallel turbo fan-out fails as "Hook timed out in 10000ms".
    hookTimeout: 30_000,

    environment: 'node',
    watch: false,
    include: ['scripts/__tests__/**/*.test.ts'],
    pool: 'vmThreads',
  },
});
