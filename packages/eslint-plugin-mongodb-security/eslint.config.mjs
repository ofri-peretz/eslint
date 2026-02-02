import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: ['benchmark/**'],
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
            '{projectRoot}/**/*.test.{js,cjs,mjs,ts,cts,mts}',
          ],
          ignoredDependencies: ['mongodb', 'mongoose'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
