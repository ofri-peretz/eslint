import importPlugin from 'eslint-plugin-import';

export default [
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',
      'import/no-named-as-default': 'warn',
      'import/no-named-as-default-member': 'warn',
      'import/no-duplicates': 'warn',
      'import/order': 'warn',
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
  },
];
