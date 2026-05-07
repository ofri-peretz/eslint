import importPlugin from 'eslint-plugin-import';

// No-cycle only - the most expensive rule
export default [
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-cycle': 'error',
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
  },
];
