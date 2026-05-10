import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
// `eslint-plugin-conventions` ships its built CJS at `dist/`. In the
// published layout `dist/` becomes the package root so `./src/index.js`
// resolves; in dev we mirror the built outputs back into `src/` (via the
// plugin's `build` script) so the exports field resolves consistently.
import conventionsPlugin from 'eslint-plugin-conventions';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'Users/**',
    'next-env.d.ts',
    '.source/**',
    '.interlace/**',
    'content/**',
    'e2e/**',
    'scripts/**',
    'tests/**',
  ]),
  {
    plugins: {
      conventions: conventionsPlugin,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      // Disabled for external images (shields.io badges, dev.to avatars/covers)
      // These dynamic external URLs don't benefit from Next.js Image optimization
      '@next/next/no-img-element': 'off',
      // Layer 3 of the a11y self-test model: enforce stable data-testid on
      // every interactive element + custom component. See apps/docs/A11Y.md
      // and packages/eslint-plugin-conventions/docs/rules/require-data-testid.md.
      'conventions/require-data-testid': 'warn',
    },
  },
  // Tests files don't need data-testid enforcement (they target other code,
  // not user-facing UI). Same for source files that mirror MDX content.
  {
    files: ['src/__tests__/**', 'src/**/*.test.tsx', 'src/**/*.test.ts'],
    rules: {
      'conventions/require-data-testid': 'off',
    },
  },
]);

export default eslintConfig;