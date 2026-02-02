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
            '{projectRoot}/vitest.config.{js,mjs,ts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
            '{projectRoot}/**/*.test.{js,cjs,mjs,ts,cts,mts}',
          ],
          ignoredDependencies: [
            'vitest', // Dev dependency - used for testing only
            '@nx/vite', // Dev dependency - Nx plugin for Vite/Vitest
            '@typescript-eslint/utils', // Direct dependency, not peer
            'get-tsconfig', // Direct dependency
            'enhanced-resolve', // Direct dependency
            'typescript', // Already optional peer in downstream plugins
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
