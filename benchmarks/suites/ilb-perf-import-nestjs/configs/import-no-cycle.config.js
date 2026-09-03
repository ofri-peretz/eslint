import importPlugin from 'eslint-plugin-import';
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
      import: importPlugin,
    },
    rules: {
      'import/no-cycle': 'error',
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: '/Users/ofri/repos/ofriperetz.dev/oos/nestjs/tsconfig.json',
        },
        node: true,
      },
    },
  },
];
