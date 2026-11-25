# oxlint-plugin-import-next

All notable changes to `oxlint-plugin-import-next` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 4.2.1

### Patch Changes

- **🧹 Chore** — drop the hard `oxc-resolver` dependency from import-next

  import-next never imported `oxc-resolver` itself; it reached it through `@interlace/eslint-devkit`, which already treats it as an optional peer and now resolves without it. A fresh install of import-next no longer downloads `oxc-resolver` and its native bindings. `oxc-resolver` is declared as an optional peer: install it to keep the exact previous resolution (tsconfig `references`, `#imports` maps, full `exports` pattern support).

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.2.1`

## 4.2.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.2.0`

## 4.1.11

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.11`

## 4.1.10

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.10`

## 4.1.9

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.9`

## 4.1.8

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.8`

## 4.1.7

### Patch Changes

- **📚 Docs** — Getting Started now leads each plugin README, with the ESLint install line and a flat config that loads

  The install block was below the Description and the doctrine, and on 17 of the 31 plugins there was no flat-config snippet on the page at all. `eslint-plugin-secure-coding`'s README showed `...securePlugin.configs.recommended`, which throws `TypeError: ... is not iterable` when pasted, because `configs.recommended` is one object. Every plugin README now opens with `npm install --save-dev eslint <plugin>` and `import { configs } from '<plugin>'` and `export default [configs.recommended]` in an `eslint.config.mjs`, then the Description. A test now loads that snippet in ESLint for every plugin.

  The star banner above the first heading, the footer block with the star counter and the Dev.to ask are replaced by one `## Support` paragraph at the end: report a false positive, or star the repo if the plugin helped.

  `eslint-plugin-import-next` opens with its drop-in grade, read from the newest `benchmarks/results/ilb-import-parity` result with its date: passes 2,035 of 2,135 (95.3%) of eslint-plugin-import 2.32.0's own test cases, measured 2026-11-19.

  Eight taglines now say what the plugin flags instead of "security rules for X" (secure-coding, node-security, browser-security, nestjs-security, express-security, vercel-ai-security, react-a11y, import-next). `eslint-plugin-node-security` adds one proof line: the public repositories that list it, with the date they were checked.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.7`

## 4.1.6

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.6`

## 4.1.5

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.5`

## 4.1.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.4`

## 4.1.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.3`

## 4.1.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.2`

## 4.1.1

### Patch Changes

- **🐛 Fix** — two false-positive classes on real configs, and one-line messages for `no-duplicates` and `no-extraneous-dependencies`

  Measured on a lint-clean svelte + docusaurus monorepo where eslint-plugin-import 2.32.0 reports nothing, import-next reported 129 findings. It now reports none.

  - `no-duplicates` keys a module by the file that runs: a package's `exports` are matched without the `types` condition. `svelte` and `svelte/store` share one `types` file, so `import { onMount } from 'svelte'` beside `import { get } from 'svelte/store'` was reported as a duplicate. Two imports of the same subpath are still reported.
  - `no-extraneous-dependencies` checks a specifier only once it resolves, as eslint-plugin-import does. Docusaurus' `@theme/*`, `@docusaurus/*` and `@site/*` virtual modules resolve to nothing on disk and were reported as missing packages. Under a resolver this plugin does not model (webpack, a custom one), a specifier none of the modelled resolvers finds is still checked, since that resolver may map it. An undeclared package that is not installed is left to `no-unresolved`.
  - `eslint-import-resolver-custom-alias` settings are honoured: its `alias` prefixes are rewritten to their folders (relative to the working directory, or to the `packages` folder the file is in) and resolved with its `extensions`, as that resolver does. It was resolved as if it were the node resolver.
  - The messages are one line, as eslint-plugin-import's are. `no-duplicates`: `'./m' imported multiple times (src/m.ts).`, naming the module and the file it resolves to. `no-extraneous-dependencies`: `'zod' should be listed in the dependencies of packages/app/package.json. Run 'npm i -S zod' to add it.`, naming the package and the `package.json` it belongs in. They were two lines, with an emoji and a severity word, and named neither.

  Graded by eslint-plugin-import 2.32.0's own test suite, import-next still passes 2,035 of 2,135 cases.

- **🐛 Fix** — path aliases, exported types and the resolver chain behave as in eslint-plugin-import

  Three differences from eslint-plugin-import that a TypeScript config carried over unchanged turned into wrong findings:

  - `no-extraneous-dependencies` no longer reports a path alias that resolves to a file of the package (`import { x } from '@/utils'` through tsconfig `paths`, or a bare name the node resolver finds in its `paths`) as a package missing from `package.json`. Such a module is internal, and internal modules are checked only under `includeInternal: true`. It is `false` by default, in eslint-plugin-import 2.32.0 and here. A file outside the linted file's package, or in `node_modules` or an `import/external-module-folders` folder, is external, as there. Before reporting, the rule also reads the name in the `package.json` of the resolved file, so an alias into another workspace package is accepted when that package is declared.
  - `prefer-default-export` no longer reports a module that exports a type (`export type`, `export interface`, `export type { T }`, `export { type T }`) next to one value, under any target. A type alias cannot be a default export, and eslint-plugin-import leaves such a module alone. This fixes one of eslint-plugin-import's own valid test cases.
  - Resolution now tries the resolvers in `settings['import/resolver']` in order until one finds the file. Each resolver is approximated (the node and typescript settings, `paths` and custom aliases), not invoked: a resolver this plugin does not model, such as webpack, is treated as the default resolver, so a webpack-only alias can stay unresolved. With `{ node: { extensions: ['.ts', '.json'] }, typescript: true }`, `./b` in a `.js` file now resolves to `b.js` through the typescript resolver after the node resolver misses it. Before, only the node resolver's extensions were tried, so `no-unresolved` reported the import and `extensions` missed `.js` extensions in `.js` files. `import/resolve` is read only when `import/resolver` is absent, as there.

  Graded by eslint-plugin-import 2.32.0's own test suite, import-next now passes 2,035 of 2,135 cases (was 2,033).

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.1`

## 4.1.0

### Minor Changes

- **✨ Feature** — `flatConfigs`, key for key with eslint-plugin-import, and Node 20.19 support

  A config written for eslint-plugin-import now works when only its import line changes:

  ```diff
  - import importPlugin from 'eslint-plugin-import';
  + import importPlugin from 'eslint-plugin-import-next';

    export default [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript];
  ```

  - `flatConfigs` has eslint-plugin-import 2.32.0's seven keys (`recommended`, `errors`, `warnings`, `react`, `react-native`, `electron`, `typescript`), with the same `import/…` rule IDs, severities, `settings`, `languageOptions` and `name`, and registers the plugin as `import`. Before this, `importPlugin.flatConfigs.errors` was `undefined` and such a config failed to load. A test compares every key with the installed eslint-plugin-import and lints a fixture with both through ESLint, expecting the same findings (rule, line, severity).
  - The default export and the named `plugin` export are now both the module itself, the object `require()` and an `eslint.config.mjs` default import already returned, with a top-level `meta`. Every preset (`configs.*`, `flatConfigs.*`) registers that same object. Every loader (Node ESM, CommonJS, TypeScript/jiti) gets one plugin object, so registering it yourself next to a preset loads, for example `{ plugins: { import: importPlugin } }` next to `importPlugin.flatConfigs.errors`. Before, that threw `Cannot redefine plugin`. It still carries `meta` and `rules` as before.
  - `engines.node` is now `^20.19.0 || ^22.13.0 || >=24`, ESLint 10's range, for eslint-plugin-import-next, oxlint-plugin-import-next and `@interlace/eslint-devkit`. Both packages' unit suites pass on Node 20.19.0 on the ESLint side; oxlint's own `RuleTester` does not start below Node 22, so the oxlint-engine cases are not run there. A Node 20.19.0 cell is added to the nightly node-version matrix (ADR 0013).

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.1.0`

## 4.0.0

### Major Changes

- **💥 Breaking** — a drop-in replacement for eslint-plugin-import — 95.2% of its own cases pass

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

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-import-next@4.0.0`

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
