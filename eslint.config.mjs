import nx from '@nx/eslint-plugin';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import localPlugin from './tools/eslint-rules/index.js';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
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
      // Enforce node: protocol for Node.js built-in imports (e.g., 'node:fs' instead of 'fs')
      'unicorn/prefer-node-protocol': 'error',
    },
  },
  // Local rule: Ensure vitest configs have watch: false for CI
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
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,mjs,ts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
          ignoredDependencies: [
            'eslint', // Peer dependency - provided by consuming projects
            'vitest', // Dev dependency - used for testing only
            '@nx/vite', // Dev dependency - Nx plugin for Vite/Vitest
          ],
        },
      ],
    },
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
];
