---
'eslint-plugin-import-next': minor
'oxlint-plugin-import-next': minor
---

feat(import-next): the last two eslint-plugin-import rules, and 85.1% of its own cases pass

Graded by eslint-plugin-import@2.32.0's own RuleTester cases, `import-next`
now passes 1,816 of 2,135 (85.1%, up from 1,711 / 80.1%), and none of the 45
rules that suite tests is missing.

Two new rules, with eslint-plugin-import's names and options:

- `enforce-node-protocol-usage` (`'always'`, the default, or `'never'`): one
  spelling for Node.js builtins, `node:fs` or `fs`, on every way a module is
  loaded. Honours `import/node-version`. Fixable.
- `no-webpack-loader-syntax`: a `!` in a module specifier
  (`style!css!./app.css`) configures webpack loaders inline.

Neither is in a preset; enable them by name.

Findings that change with no option involved:

- `no-useless-path-segments` reports `./` and `../` (they are `.` and `..`). A
  trailing slash after a name (`./lib/`) is still left alone.
- `dynamic-import-chunkname` reports a magic comment webpack cannot read
  (`/* webpackChunkName: "a" ; */`), and a documented webpack option with a
  value webpack ignores (`webpackMode: "fast"`, `webpackPrefetch: "x"`).
- `no-unresolved` reports a value import of a `@types/*` package, which Node
  cannot load and TypeScript refuses (TS6137). `import type` from one is fine.
- `no-unresolved`, `extensions` and `no-internal-modules` honour
  eslint-plugin-import's node-resolver settings,
  `import/resolver: { node: { extensions, paths } }` and the older
  `import/resolve`: extensions are tried in that order, and a bare specifier
  is also looked up in `paths`.
- `no-internal-modules` matches `allow` / `forbid` globs the way
  eslint-plugin-import does: against the folded path steps
  (`./plugin/index.js` is `plugin/index.js`) and the resolved file as well as
  the specifier, and reads `{a,b}` alternatives.
- `export` allows one default per `declare module 'x' {}` block, and no longer
  counts an overload signature (`export default function f(a: string): void;`)
  as a second default.
- `no-duplicates` no longer reports a type-only default beside type-only named
  imports of one module: `import type D, { A }` is not valid TypeScript, so
  the two cannot be merged.
