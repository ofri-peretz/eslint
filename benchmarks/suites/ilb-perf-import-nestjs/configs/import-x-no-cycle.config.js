import importX from 'eslint-plugin-import-x';
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
      'import-x': importX,
    },
    rules: {
      'import-x/no-cycle': 'error',
    },
    settings: {
      'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import-x/resolver': {
        typescript: {
          project: '/Users/ofri/repos/ofriperetz.dev/oos/nestjs/tsconfig.json',
        },
        node: true,
      },
    },
  },
];
