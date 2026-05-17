import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest config for @interlace/eslint-config.
 *
 * Tests are pure structural locks against the composed flat-config arrays —
 * they don't execute ESLint. Coverage thresholds are conservative because
 * the package is ~200 LOC of glue code.
 *
 * Plugin resolution: each plugin's `package.json#main` points to
 * `./src/index.js`, which only exists in the published `dist/` tarball, not
 * in the workspace source tree. We alias every Interlace plugin name to its
 * TS source so vitest resolves through esbuild and matches what tsc sees.
 *
 * If you add a new plugin to the meta-config, add it here too.
 */
const pluginSource = (name: string): readonly [string, string] => [
  name,
  resolve(__dirname, `../${name}/src/index.ts`),
];

const INTERLACE_PLUGINS = [
  'eslint-plugin-import-next',
  'eslint-plugin-pg',
  'eslint-plugin-secure-coding',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-jwt',
  'eslint-plugin-browser-security',
  'eslint-plugin-react-features',
  'eslint-plugin-react-a11y',
  'eslint-plugin-vercel-ai-security',
  'eslint-plugin-node-security',
  'eslint-plugin-express-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-conventions',
  'eslint-plugin-maintainability',
  'eslint-plugin-reliability',
  'eslint-plugin-operability',
  'eslint-plugin-modularity',
  'eslint-plugin-modernization',
] as const;

const PLUGIN_ALIASES = Object.fromEntries(INTERLACE_PLUGINS.map(pluginSource));

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: PLUGIN_ALIASES,
  },
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
    // Setting `exclude` replaces vitest's defaults — spread them back in and
    // add build-artifact dirs so stale outputs can never shadow real tests.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/.next/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/coverage/**',
    ],
    passWithNoTests: false,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'eslint-config', color: 'magenta' },
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});
