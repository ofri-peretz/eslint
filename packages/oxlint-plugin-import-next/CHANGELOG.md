# oxlint-plugin-import-next

All notable changes to `oxlint-plugin-import-next` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 3.2.1

### Patch Changes

- **🐛 Fix** — dynamic-import-chunkname messages state CVSS 2.5, matching their LOW label

  The three messages cited CWE-1078 and so rendered its generic score, 5.3 (the
  MEDIUM band), beside a LOW label. A chunk-naming slip is hygiene, not a
  vulnerability, so each message now states the 2.5 its `meta.docs.cvss` already
  declared. Message text only; what the rule reports is unchanged.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@3.2.1`

## 3.2.0

### Minor Changes

- **✨ Feature** — the last two eslint-plugin-import rules, and 85.1% of its own cases pass

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

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@3.2.0`

## 3.1.0

### Minor Changes

- **✨ Feature** — accept eslint-plugin-import's options, with their meaning — 80.1% of its own test cases now pass

  A config carried over from `eslint-plugin-import` (which has no ESLint 10
  release) no longer fails to load on an option `import-next` did not know.
  Graded by eslint-plugin-import@2.32.0's own RuleTester cases, `import-next`
  now passes 1,711 of 2,135 (80.1%, up from 1,180 / 55.3%), and no graded case
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

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@3.1.0`

## 3.0.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@3.0.2`

## 3.0.1

### Patch Changes

- **🧹 Chore** — complete the npm metadata in every package manifest

  Every manifest declares `"sideEffects": false`; no module changes state outside itself when it is loaded, so a bundler may drop what it does not use. The `funding` field is removed: it pointed at the source repository, not at a funding page, so `npm fund` led nowhere useful. Each `oxlint-plugin-*` alias also declares an `exports` map (`.` and `./index.js`, each with `types` first, and `./package.json`); every path that resolved before still resolves. No code changes.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@3.0.1`

## 3.0.0

### Major Changes

- **💥 Breaking** — requires Node 22.13 or later; Node 18 and 20 are end-of-life

  `engines.node` is now `>=22.13.0` (was `>=18.0.0`). Node 22.13, 24 and 26 are the versions tested. Stay on the previous major if you cannot leave Node 18 or 20 yet.

  ## Migration

  Run your linter on Node 22.13 or later, or pin the previous major until you can:

  ```sh
  # Before: any Node 18+
  node --version   # v20.x
  # After: Node 22.13+ (24 and 26 are also tested)
  nvm install 22 && nvm use 22   # or 24, or 26
  ```

  Nothing in your ESLint or oxlint config changes.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@3.0.0`

## 2.9.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@2.9.4`

## 2.9.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@2.9.3`

## 2.9.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@2.9.2`

## 2.9.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@2.9.1`

## 2.9.0

### Minor Changes

- **✨ Feature** — every rule runs natively on oxlint and Vite+, published as `oxlint-plugin-<name>` too

  - **`oxlint-plugin-<name>`**: each plugin now has an oxlint-native twin on npm,
    for installs from oxlint or Vite+ (`lint.jsPlugins: ['oxlint-plugin-<name>']`
    in `vite.config.ts`). It re-exports the same rules under the same
    `<name>/<rule>` IDs, at the same version, and does not install ESLint.
  - **`createOnce`**: 457 of 473 rule definitions are written in oxlint's
    `createOnce` shape, with per-file state reset in `before()`. ESLint runs the
    same rule object through a `create` the devkit derives from it, so ESLint
    behaviour is unchanged: every existing test passes, and oxlint parity on the
    benchmark corpus stays at 100% (3,932 shared findings, none on one engine
    only). The remaining 16 are listed, with reasons, in
    `.agent/create-rule-allowlist.json`.
  - **`meta.interop.runtimes`**: every rule now states where it is known to
    behave identically. `['eslint', 'oxlint']` means its own test suite passes
    on oxlint's RuleTester as well as ESLint's, and the tests enforce that on
    every run; type-aware rules stay `['eslint']`. The ESLint-only rules and the
    reason for each are listed in `docs/oxlint-runtimes.md`.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@2.9.0`
