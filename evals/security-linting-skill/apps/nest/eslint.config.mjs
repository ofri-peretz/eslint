import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  // The project's existing security lint: eslint-plugin-security only.
  security.configs.recommended,
];
