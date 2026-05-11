import importPlugin from 'eslint-plugin-import';

// Recommended configuration - full recommended preset
export default [
  importPlugin.flatConfigs.recommended,
  {
    settings: {
      'import/resolver': {
        node: true,
      },
    },
  },
];
