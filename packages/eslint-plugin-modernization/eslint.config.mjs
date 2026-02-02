import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
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
          ignoredDependencies: [
            'vitest', // Dev dependency - used for testing only
            '@nx/vite', // Dev dependency - Nx plugin for Vite/Vitest
            'vite', // Dev dependency - build tool
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
