import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

// `eslint-plugin-conventions` is a workspace package. Its `package.json`
// `main` points at `./src/index.js`, which only exists after the package's
// build script has run. In a fresh checkout (or before turbo builds the
// dependency graph) the workspace symlink resolves to a non-existent file.
// We try the workspace-resolvable name first and fall back to the explicit
// dist path; either way, if the plugin cannot be loaded we register no
// rules from it rather than crashing the lint run.
let conventionsPlugin = null;
try {
  conventionsPlugin = (await import('eslint-plugin-conventions')).default;
} catch {
  try {
    conventionsPlugin = (
      await import('eslint-plugin-conventions/dist/src/index.js')
    ).default;
  } catch {
    // Plugin not built yet — lint will run without the conventions rules.
    // Re-run `turbo run build --filter=eslint-plugin-conventions` to
    // restore them.
  }
}

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
    ...(conventionsPlugin ? { plugins: { conventions: conventionsPlugin } } : {}),
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      // Disabled for external images (shields.io badges, dev.to avatars/covers)
      // These dynamic external URLs don't benefit from Next.js Image optimization
      '@next/next/no-img-element': 'off',
      // Layer 3 of the a11y self-test model: enforce stable data-testid on
      // every interactive element + custom component. See apps/docs/A11Y.md
      // and packages/eslint-plugin-conventions/docs/rules/require-data-testid.md.
      // Conditional on the plugin being available — see top of file.
      ...(conventionsPlugin ? { 'conventions/require-data-testid': 'warn' } : {}),
    },
  },
  // Tests files don't need data-testid enforcement (they target other code,
  // not user-facing UI). Same for source files that mirror MDX content.
  ...(conventionsPlugin
    ? [
        {
          files: ['src/__tests__/**', 'src/**/*.test.tsx', 'src/**/*.test.ts'],
          rules: {
            'conventions/require-data-testid': 'off',
          },
        },
      ]
    : []),
]);

export default eslintConfig;