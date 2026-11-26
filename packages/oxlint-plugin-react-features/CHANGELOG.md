# oxlint-plugin-react-features

All notable changes to `oxlint-plugin-react-features` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.4.5

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.4.5`

## 2.4.4

### Patch Changes

- **🧹 Chore** — raise `@eslint-community/regexpp` to `^4.12.3` in secure-coding, and write jsx-no-script-url's scheme check without raw control bytes

  secure-coding now requires `@eslint-community/regexpp` `^4.12.3` (was `^4.10.0`). react-features' `jsx-no-script-url` skips leading code units at or below U+0020 and drops tab, LF and CR in code instead of a regex with raw C0 bytes in its source, so oxlint's `no-control-regex` passes. It reports the same values as before.

- **🐛 Fix** — jsx-key matches eslint-plugin-react's defaults and reports only returned list items

  On ServerKit (`frontend/src`, 804 files) `react/jsx-key` reported 86 hits that eslint-plugin-react 7.37.5 does not (78 index keys, 8 fragments), 0 after this change.

  - `warnUnstableKeys` now defaults to `false`. Upstream's `jsx-key` has no index-key check (that is `no-array-index-key`); set `warnUnstableKeys: true` to keep the report.
  - A shorthand fragment returned from a `map` / `Array.from` callback is reported only with `checkFragmentShorthand: true` (upstream `jsx-key.js:101`), as the same fragment in an array literal already was.
  - An element, fragment or `createElement` call is judged as a list item only when it is the callback's arrow body or a `return` argument (through the branches of `?:` and the right side of `&&` / `||`). One bound to a variable, passed as an argument or nested in another element (`const body = <>...</>; return <li key={i}>{body}</li>`) is no longer reported as a keyless item.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.4.4`

## 2.4.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.4.3`

## 2.4.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.4.2`

## 2.4.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.4.1`

## 2.4.0

### Minor Changes

- **✨ Feature** — three react-app rules, upstream-shaped `configs.recommended` under the alias, Node 20.19

  Three more of eslint-plugin-react's rules, with its names, option schemas and semantics, the ones `eslint-config-react-app`-style configs turn on:

  - `style-prop-object` (option `allow`): a `style` prop that is a string, number or boolean, directly or through a `const` in the file, in JSX and in `React.createElement`.
  - `jsx-pascal-case` (options `allowAllCaps`, `allowLeadingUnderscore`, `allowNamespace`, `ignore`): user-defined components are PascalCase. `ignore` takes names and globs (`*`, `?`, `[ab]`, `{a,b}`, extglobs) through a small matcher inside the package, which still has no runtime dependencies.
  - `forbid-foreign-prop-types` (option `allowInPropTypes`): reading another component's `propTypes`.

  All three are in `configs.all` and `configs.flat.all` under `react/<rule>`, and not in `recommended`, as upstream. eslint-plugin-react 7.37.5's own test cases agree: `style-prop-object` 70 of 70, `jsx-pascal-case` 85 of 85, `forbid-foreign-prop-types` 38 of 38, on the default parser and on `@typescript-eslint/parser`, and reports land on upstream's line, column and node type. Where a key can be spelled `'k'` or `` `k` `` as well as `k`, all spellings count.

  When the package is installed as `eslint-plugin-react` (`"eslint-plugin-react": "npm:eslint-plugin-react-features"`), `configs.recommended` is now eslint-plugin-react's: legacy-shaped, `react/<rule>` ids, the same 22 rules as `configs.flat.recommended`. That is what `plugin:react/recommended` through `FlatCompat` and a spread of `react.configs.recommended.rules` read. Before, both got `react-features/*` ids, which fail at config load under a plugin registered as `react`. Under its own name the package is unchanged: `configs.recommended` is still the flat `react-features/` preset. The install is told by where the files sit (`node_modules/eslint-plugin-react/`). Two presets are reachable by name in either install, for a setup where the files are not under `node_modules`: `configs['react-recommended']` (upstream shape) and `configs['react-features-recommended']` (this package's own).

  `engines.node` is now ESLint 10's range, `^20.19.0 || ^22.13.0 || >=24`, for both packages (ADR 0014). Nothing in the package needs Node 22.13: it imports only `node:fs`, `node:module` and `node:path`, uses no API newer than Node 20.19, and its one dependency, `@interlace/eslint-devkit`, already declares this range. The unit suite passes on Node 20.19.0 (3,381 passed, 0 failed; the oxlint half of the rule tests, which oxlint's own tester cannot run below Node 22, is skipped there), and a Node 20.19.0 cell for the package joins the nightly node-version matrix. Raising a floor needs a major and lowering one does not, so this is a minor.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.4.0`

## 2.3.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.3.1`

## 2.3.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.3.0`

## 2.2.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.2.0`

## 2.1.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.1.2`

## 2.1.1

### Patch Changes

- **📚 Docs** — Getting Started now leads each plugin README, with the ESLint install line and a flat config that loads

  The install block was below the Description and the doctrine, and on 17 of the 31 plugins there was no flat-config snippet on the page at all. `eslint-plugin-secure-coding`'s README showed `...securePlugin.configs.recommended`, which throws `TypeError: ... is not iterable` when pasted, because `configs.recommended` is one object. Every plugin README now opens with `npm install --save-dev eslint <plugin>` and `import { configs } from '<plugin>'` and `export default [configs.recommended]` in an `eslint.config.mjs`, then the Description. A test now loads that snippet in ESLint for every plugin.

  The star banner above the first heading, the footer block with the star counter and the Dev.to ask are replaced by one `## Support` paragraph at the end: report a false positive, or star the repo if the plugin helped.

  `eslint-plugin-import-next` opens with its drop-in grade, read from the newest `benchmarks/results/ilb-import-parity` result with its date: passes 2,035 of 2,135 (95.3%) of eslint-plugin-import 2.32.0's own test cases, measured 2026-11-19.

  Eight taglines now say what the plugin flags instead of "security rules for X" (secure-coding, node-security, browser-security, nestjs-security, express-security, vercel-ai-security, react-a11y, import-next). `eslint-plugin-node-security` adds one proof line: the public repositories that list it, with the date they were checked.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.1.1`

## 2.1.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.1.0`

## 2.0.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.0.4`

## 2.0.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.0.3`

## 2.0.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.0.2`

## 2.0.1

### Patch Changes

- **🧹 Chore** — complete the npm metadata in every package manifest

  Every manifest declares `"sideEffects": false`; no module changes state outside itself when it is loaded, so a bundler may drop what it does not use. The `funding` field is removed: it pointed at the source repository, not at a funding page, so `npm fund` led nowhere useful. Each `oxlint-plugin-*` alias also declares an `exports` map (`.` and `./index.js`, each with `types` first, and `./package.json`); every path that resolved before still resolves. No code changes.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.0.1`

## 2.0.0

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

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@2.0.0`

## 1.8.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@1.8.1`

## 1.8.0

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

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-react-features@1.8.0`
