# order

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforce a convention in module import order, with eslint-plugin-import's options and defaults

## Rule Details

eslint-plugin-import's `import/order` (v2.32.0): its options, with their
meaning, and its defaults. A config carried over from eslint-plugin-import
means here what it meant there, options or none.

Imports are ranked by group, in the configured order. With no options the
groups are `builtin`, `external`, `parent`, `sibling`, `index`; there is no
alphabetizing and no blank-line policy. Each import that sits after one of a
later group is reported once, with a fix that moves it. Top-level `require()`
calls are ordered too, after the imports; an import that binds nothing
(`import './setup'`) is never moved.

> **Changed in 4.0.** Until 4.0, `order` was an alias of
> `enforce-import-order`, import-next's opinionated ordering (alphabetized,
> a blank line between groups, `internalPatterns`, one report for the whole
> block), unless its options were written eslint-plugin-import's way. That
> rule is unchanged, and it is what the `strict`, `typescript` and
> `import-style` presets use. To keep it, rename the rule in your config:
> `'import-next/enforce-import-order'`. `internalPatterns` and
> `newlinesBetween` are its options; written under `order`, they are refused
> rather than ignored.

### ❌ Incorrect

```ts
import sib from './sib';
import fs from 'fs';
```

### ✅ Correct

```ts
import fs from 'fs';
import react from 'react';
import up from '../up';
import sib from './sib';
```

## Options

Every option of eslint-plugin-import's `import/order` (v2.32.0): `groups`
(including nested arrays and `unknown`, `object`, `type`), `pathGroups`,
`pathGroupsExcludedImportTypes`, `distinctGroup`, `newlines-between`,
`newlines-between-types`, `alphabetize` (`order`, `orderImportKind`,
`caseInsensitive`), `named`, `sortTypesGroup`, `consolidateIslands`,
`warnOnUnassignedImports`. Settings read: `import/internal-regex`,
`import/core-modules`, `import/external-module-folders`.

```js
'import-next/order': ['error', {
  groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
  pathGroups: [{ pattern: '@app/**', group: 'internal', position: 'before' }],
  'newlines-between': 'always',
  alphabetize: { order: 'asc', caseInsensitive: true },
}]
```

Deliberate differences:

- `pathGroups[].patternOptions` accepts only `matchBase`, `nocase`, `nonegate`
  and `nocomment`; any other minimatch switch is refused rather than ignored.
  Patterns are matched by Node's `path.matchesGlob` (case-sensitive on every
  platform), where `\` is not an escape.
- Specifiers are classified with import-next's resolver; `import/resolver`
  settings are not consulted.
- `named.cjsExports` orders `exports['a'] = …` like `exports.a = …` (the same
  export; eslint-plugin-import reads only the dotted form).
- `named.cjsExports` treats `exports` / `module` as shadowed when the
  enclosing block declares it or the enclosing function takes it as a
  parameter (no scope analysis, so the rule also runs under oxlint).
- The fix moves a CommonJS export assignment only across other assignment
  statements. Unassigned imports are reported but never moved.
- Where eslint-plugin-import crashes or misreports, this does not: a
  destructured `require()` with a rest element, a file with no `package.json`
  above it, and string-named specifiers (`import { 'a-b' as ab }`).

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/order.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/order.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
