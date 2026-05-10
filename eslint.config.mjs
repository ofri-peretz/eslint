import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import oxlint from 'eslint-plugin-oxlint';
import localPlugin from './tools/eslint-rules/index.js';

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
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
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
