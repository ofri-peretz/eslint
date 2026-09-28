import { fixupConfigRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

// ESLint 10 compatibility for eslint-config-next (16.3.x, latest as of this
// change). Two independent breakages, each crashing the whole lint run:
//
// 1. Parser. For `*.{js,jsx,mjs,mts,cts}`, the `next` config block sets
//    `languageOptions.parser` to `eslint-config-next/parser`, a thin wrapper
//    over `next/dist/compiled/babel/eslint-parser` — a copy of
//    `@babel/eslint-parser` bundled INSIDE `next` (so no `overrides` pin can
//    reach it). Its ScopeManager predates ESLint 10, which calls
//    `scopeManager.addGlobals()` on every file:
//      TypeError: scopeManager.addGlobals is not a function
//    No `next` release (16.3.6, 16.4.0-canary.50) ships a fixed bundle, so
//    those files are parsed with typescript-eslint's parser instead — the same
//    parser eslint-config-next already uses for `*.ts`/`*.tsx`, whose
//    ScopeManager implements `addGlobals`. It parses plain JS and JSX too.
//
// 2. Plugin rules. eslint-plugin-react 7.37.5 (latest) calls
//    `context.getFilename()` for `settings.react.version: 'detect'`; ESLint 10
//    removed that method. `fixupConfigRules` is ESLint's official shim: it
//    wraps every plugin rule so the removed context/SourceCode methods are
//    restored, without changing which rules run or their severity.
//
// Drop each shim once its upstream ships ESLint 10 support; removing one early
// brings the crash back on the first `npm run lint --workspace=docs`.
const nextVitalsEslint10 = [
  ...fixupConfigRules(nextVitals),
  {
    name: 'docs/eslint10-js-parser',
    files: ['**/*.{js,jsx,mjs,cjs,mts,cts}'],
    languageOptions: { parser: tseslint.parser },
  },
];

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
  ...nextVitalsEslint10,
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