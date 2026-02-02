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
          ignoredDependencies: ['pg', 'vitest', '@nx/vite'], // Optional peer dep and dev tools
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
