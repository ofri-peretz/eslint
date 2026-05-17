import importNext from '../../../../dist/packages/eslint-plugin-import-next/src/index.js';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    plugins: {
      'import-next': importNext,
    },
    rules: {
      'import-next/no-cycle': 'error',
    },
    settings: {
      'import-next/resolver': {
        typescript: {
          project: '/Users/ofri/repos/ofriperetz.dev/oos/nestjs/tsconfig.json',
        },
        node: true,
      },
    },
  },
];
