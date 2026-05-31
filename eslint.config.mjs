import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import oxlint from 'eslint-plugin-oxlint';
import tseslint from 'typescript-eslint';
import localPlugin from './tools/eslint-rules/index.js';
import reactA11y from 'eslint-plugin-react-a11y';
import reactFeatures from 'eslint-plugin-react-features';

// Dogfood the meta-package. `componentApi` is a flat-config array binding
// the react-features componentApi preset (R5/R6/R8/R11/R12/R18/R19) under
// the plugin's canonical `react-features/component-api/*` rule names —
// we restrict it to the @interlace/ui primitives via a per-block `files`
// override below, since the meta-package's preset binds globally.
import { componentApi as componentApiPreset } from '@interlace/eslint-config';

// ─────────────────────────────────────────────────────────────────────────────
// Root ESLint config (flat, ESLint v9+).
//
// History: this used to layer @nx/eslint-plugin presets and Nx-specific
// rules (@nx/enforce-module-boundaries, @nx/dependency-checks). Those left
// the repo with the Nx → Turbo migration. Module boundaries are now
// enforced by Turbo's task graph; package.json dependency hygiene is
// covered by `audit:portability` + `audit:meta` scripts.
// ─────────────────────────────────────────────────────────────────────────────

export default [
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      // AI-generated benchmark fixtures + labelled corpus samples are
      // deliberately weird code (the detectors are graded against them).
      // Linting them with our own rules would corrupt benchmarks and
      // produce noise that drowns out real findings.
      'benchmarks/suites/ilb-ai/generated*/**',
      'benchmarks/corpus/**',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  // TypeScript parser config — required for the @typescript-eslint/* rules
  // below and for the meta-package's componentApi preset to actually fire
  // on .tsx primitives (without a TS parser the file fails to parse and
  // the rules silently no-op — which is how the @eslint/react-features
  // naming-drift escaped detection for weeks before 139b6208).
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.jsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'unicorn/prefer-node-protocol': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    rules: {
      'no-unused-vars': 'error',
      'unicorn/prefer-node-protocol': 'error',
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    plugins: {
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      // Enforce node: protocol for Node.js built-ins (e.g. 'node:fs' over 'fs').
      'unicorn/prefer-node-protocol': 'error',
    },
  },
  // Local rule: vitest configs must have watch: false for CI determinism.
  {
    files: [
      '**/vitest.config.mts',
      '**/vitest.config.ts',
      '**/vitest.config.js',
    ],
    plugins: {
      local: localPlugin,
    },
    rules: {
      'local/require-vitest-watch-false': 'error',
    },
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/CHANGELOG.md'],
    plugins: {
      local: localPlugin,
    },
    languageOptions: {
      parser: {
        parse: (text) => ({
          type: 'Program',
          body: [],
          tokens: [],
          comments: [],
          range: [0, text.length],
          loc: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 0 },
          },
          sourceType: 'module',
        }),
      },
    },
    rules: {
      'local/changelog-format': 'error',
    },
  },

  // ── react-a11y + react-features — UI / Storybook / docs surfaces ────────
  {
    files: [
      'packages/ui/src/**/*.{ts,tsx}',
      'apps/storybook/src/**/*.{ts,tsx}',
      'apps/docs/src/**/*.{ts,tsx}',
    ],
    plugins: {
      'react-a11y': reactA11y,
      'react-features': reactFeatures,
    },
    rules: {
      ...reactA11y.configs.recommended.rules,
      ...reactFeatures.configs.recommended.rules,
      // Component-API rules for the DS surface only
    },
  },
  {
    // Component-API rules for DS primitives only (stricter)
    files: ['packages/ui/src/primitives/**/*.tsx'],
    plugins: { 'react-features': reactFeatures },
    rules: {
      ...reactFeatures.configs.componentApi.rules,
    },
  },

  // ── @interlace/ui — componentApi floor (R5/R6/R8/R11/R12/R18/R19) ─────
  // Sourced from `@interlace/eslint-config`'s `componentApi` preset.
  // Scoped to UI primitives via `files` (the preset binds globally by
  // default; that's correct for consumer apps but too broad for an
  // ecosystem repo where most code isn't shared components).
  ...componentApiPreset.map((c) => ({
    ...c,
    files: ['packages/ui/src/primitives/**/*.tsx'],
  })),

  // ── oxlint integration ──────────────────────────────────────────────────
  // Disable ESLint rules that oxlint handles natively in Rust (50-100× faster).
  // oxlint runs FIRST (via `npm run oxlint`), then ESLint runs only custom rules.
  ...oxlint.configs['flat/recommended'],
  ...oxlint.configs['flat/correctness'],
  ...oxlint.configs['flat/suspicious'],
  ...oxlint.configs['flat/perf'],
  ...oxlint.configs['flat/unicorn'],
  ...oxlint.configs['flat/typescript'],
];
