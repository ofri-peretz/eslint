---
'eslint-plugin-import-next': minor
'oxlint-plugin-import-next': minor
---

feat(import-next): accept eslint-plugin-import's options, with their meaning — 80.2% of its own test cases now pass

A config carried over from `eslint-plugin-import` (which has no ESLint 10
release) no longer fails to load on an option `import-next` did not know.
Graded by eslint-plugin-import@2.32.0's own RuleTester cases, `import-next`
now passes 1,713 of 2,135 (80.2%, up from 1,180 / 55.3%), and no graded case
sets an option it rejects (528 did).

Options are honoured, not just accepted: `order`'s `newlines-between`,
`pathGroups`, `named`, `sortTypesGroup` and the rest; `extensions`'
`['always']` / `ignorePackages` / `checkTypeImports` / `pathGroupOverrides`;
`no-restricted-paths`' `zones`; `no-cycle`'s `commonjs`, `amd`, `ignoreExternal`,
`allowUnsafeDynamicCyclicDependency` and `maxDepth: '∞'`;
`newline-after-import`'s `count`, `exactCount`, `considerComments`; and the
upstream options of `no-unresolved`, `no-extraneous-dependencies`,
`prefer-default-export`, `no-unassigned-import`, `no-anonymous-default-export`,
`named`, `no-commonjs`, `no-duplicates`, `first`, `namespace` and
`no-unused-modules`. Where an upstream default differs from this plugin's own,
this plugin's default still applies when the option is absent, so existing
configs lint as before. Each rule's docs list the options and the differences.

Two behaviour changes with no option involved:

- `no-cycle` reads the linted file's own imports from the source being linted,
  not from disk, so an unsaved editor buffer or `--stdin` is checked as written.
- `newline-after-import` now also checks a block of top-level `require()` calls,
  as `import/newline-after-import` does. CommonJS files may see new findings.
