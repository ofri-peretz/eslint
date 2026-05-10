import importPlugin from 'eslint-plugin-import';

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.mjs', '.cjs'],
        },
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-relative-packages': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/export': 'error',
      'import/no-commonjs': 'warn',
      'import/no-amd': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
      'import/no-mutable-exports': 'error',
    },
  },
];
