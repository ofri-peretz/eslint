---
'eslint-plugin-conventions': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-modularity': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
---

fix: `ignoreInTests` now skips `.test`/`.spec` files with `.mjs`, `.cjs`, `.mts` and `.cts` extensions.

Eight rules matched test files with `/\.(test|spec)\.(ts|tsx|js|jsx)$/`, so a
`foo.test.cjs` or `foo.spec.mts` was linted as production code despite
`ignoreInTests` defaulting to `true`. They now use `/\.(test|spec)\.[cm]?[jt]sx?$/`,
the pattern reliability adopted in #1080: `no-commented-code`, `no-silent-errors`,
`no-missing-error-context`, `no-external-api-calls-in-utils`,
`no-missing-aria-labels`, `no-keyboard-inaccessible-elements`,
`no-unnecessary-rerenders` and `react-render-optimization`.
