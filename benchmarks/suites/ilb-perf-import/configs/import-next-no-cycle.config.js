import importNext from 'eslint-plugin-import-next';

// No-cycle only - the most expensive rule
export default [
  {
    plugins: {
      'import-next': importNext,
    },
    rules: {
      'import-next/no-cycle': 'error',
    },
  },
];
