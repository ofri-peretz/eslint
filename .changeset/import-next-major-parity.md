---
'eslint-plugin-import-next': major
'oxlint-plugin-import-next': major
---

feat(import-next): a drop-in replacement for eslint-plugin-import — 95.2% of its own cases pass

Graded by eslint-plugin-import@2.32.0's own RuleTester cases, `import-next`
now passes 2,033 of 2,135 (95.2%, up from 1,816 / 85.1%). Three behaviours
change to match eslint-plugin-import, so this is a major version.

## Migration

Each change can be undone per rule:

```diff
  rules: {
-   'import-next/order': ['error', { newlinesBetween: 'always' }],
+   'import-next/enforce-import-order': ['error', { newlinesBetween: 'always' }],
  },
+ // To keep 3.x's silence about other modules without type information:
+ settings: { 'import/ignore': ['.'] },
```

The details, rule by rule:

### 1. Other modules are read without type information

`named`, `namespace`, `default`, `no-deprecated`, `no-named-as-default`,
`no-named-as-default-member` and `export` used to read other modules only
through TypeScript, so without type information they reported nothing about
them. Now, without type information, they parse the imported module the way
eslint-plugin-import does. With type information nothing changes.

New findings you may see:

- `named`: `import { x } from './m'` (and `export { x } from`, and with
  `commonjs: true` a destructured `require()`) where `./m` does not export
  `x`, followed through `export { … } from` and `export *`;
- `default`: a default import of a module with no default export;
- `namespace`: `ns.missing`, `const { missing } = ns`, `<ns.Missing />`,
  through re-exported namespaces too (`ns.inner.missing`); an assignment to
  a member (`ns.a = 1`); `import * as ns` of a module that exports nothing;
- `no-deprecated`: an import of an export whose JSDoc (or, with
  `settings['import/docstyle']`, TomDoc) says `@deprecated`, each use of it,
  and a module whose `@module` block is `@deprecated`;
- `no-named-as-default`, `no-named-as-default-member`: the module's own
  named exports now count as evidence, not only names this file imports;
- `export`: `export *` of a module that shares a name with this module's
  exports (or with another `export *`), and `export *` of a module with no
  named exports;
- `Parse errors in imported module '…'` from `default`, `namespace`,
  `no-deprecated`, `no-named-as-default`, `no-named-as-default-member` and
  `export`, when the imported module does not parse with the configured
  parser.

Only files with an extension the config parses are read: `.js`, `.mjs`,
`.cjs`, plus `settings['import/extensions']` and every extension
`settings['import/parsers']` maps to a parser (for `.ts`, add
`'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] }`). Files
matching `settings['import/ignore']`, files over 1 MB, and CommonJS files are
unknown, and an unknown module is never a finding. A name reached only through `export *` of
an unknown module is not reported missing, and in a TypeScript file a
JavaScript module is unknown (its `.d.ts` may add names). Each file is parsed once
per run. On oxlint, which gives plugins no parser to call, these rules do not
read other modules.

To restore 3.x behaviour: lint with type information (`projectService`), or
set `settings: { 'import/ignore': ['.'] }` to read no other module.

### 2. `order` has eslint-plugin-import's semantics

`import-next/order` was an alias of `enforce-import-order`, import-next's
opinionated ordering, unless its options were written eslint-plugin-import's
way. It is now eslint-plugin-import's `import/order`, defaults included: groups
`builtin, external, parent, sibling, index`, no alphabetizing, no blank-line
policy, one report per import out of place. `internalPatterns` and
`newlinesBetween` are refused under `order` (they were import-next's own).

To restore 3.x behaviour: rename the rule to
`'import-next/enforce-import-order'` (same options, unchanged). The `strict`,
`typescript` and `import-style` presets now enable `enforce-import-order`
instead of `order`, so preset users see no change; a config that turned
`import-next/order` off after spreading one of those presets should turn off
`import-next/enforce-import-order` instead.

### 3. `no-duplicates` and `export` report every occurrence

A module imported in three statements is now three `no-duplicates` reports
(the first statement included), and two clashing exports are two `export`
reports. The fix is unchanged. `no-duplicates` also groups imports as
eslint-plugin-import does: an import with an inline `type` specifier
(`import { type T }`) is a duplicate of `import type { … }` from the same
module, not of a value import, and a namespace import is a duplicate only of
another namespace import.

Nothing to change in a config: the verdict per file is the same. A baseline or
budget that counts findings needs refreshing.
