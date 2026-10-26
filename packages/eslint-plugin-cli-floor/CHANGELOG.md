# eslint-plugin-cli-floor

All notable changes to `eslint-plugin-cli-floor` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.2.0

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

- **🐛 Fix** — ESLint is now an optional peer, so oxlint and Vite+ installs stop pulling it in

  npm 7+ installs a required peer automatically. Every plugin, and the shared
  devkit, declared `eslint` as a required peer, so installing a plugin for
  oxlint or Vite+ installed ESLint as well. Measured 2026-10-25:
  `npm i eslint-plugin-postgresql-security` added 79 packages, eslint@10.13.0
  among them; with the peer skipped it added 2. The peer is now marked
  optional. npm still checks the version range whenever ESLint is installed,
  so ESLint users see no change.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.21.0`

## 0.1.1

### Patch Changes

- **🐛 Fix** — `resolveModuleBinding` resolves a static computed destructuring key: `const { ['promises']: fsp } = require('node:fs')` names `fs.promises` like `{ promises: fsp }` does. A runtime key (`{ [k]: v }`) still abstains. node-security's `no-arbitrary-file-access`, `no-static-iv` and `no-unbounded-decompression` now report that spelling; cli-floor drops its local copy of the same resolution.
- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.20.1`

## 0.1.0

### Minor Changes

- **✨ Feature** — new plugin — the lint half of burgee's CLI floor (F3, O3, P1) for commander, yargs and burgee programs

  Four rules, each reading a command only when its host is proven by import — the receiver of `.command()` resolves to commander's `Command` / `program` / `createCommand`, to a `yargs()` instance, to a parameter typed `Command` or `Argv` from those modules, or to the object given to burgee's `defineCommand`. A router or job queue that owns `.command()` and `.action()` is never reported.

  - `require-command-description` (F3) — a command with no description, or an empty one.
  - `require-command-example` (F3, H2) — a runnable command with no example (commander `addHelpText`, yargs `.example()` in the command's builder, burgee `examples`), and an example command line that spans more than one line.
  - `no-console-in-command` (O3) — `console.*` lexically inside a command handler, where it bypasses the output layer `--json` and non-TTY output depend on.
  - `no-prompt-without-flag` (P1, `strict` only) — a prompt from `@clack/prompts`, `inquirer`, `@inquirer/*`, `prompts`, `enquirer` or `caique` inside a handler, with no guard that reads the handler's inputs first.

  The devkit registers `plugin-cli-floor` in `PLUGIN_DOCS_CATEGORY` (`quality`); without it every rule ships with no `meta.docs.url`. The docs site gains the plugin's pages, and `sync-plugin-stats` classifies it as a quality plugin rather than defaulting it to security.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.8`
