import security from 'eslint-plugin-security';

export default [
  { ignores: ['node_modules/**'] },
  // The project's existing security lint: eslint-plugin-security only.
  security.configs.recommended,
];
