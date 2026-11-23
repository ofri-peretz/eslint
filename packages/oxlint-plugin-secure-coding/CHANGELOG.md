# oxlint-plugin-secure-coding

All notable changes to `oxlint-plugin-secure-coding` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 6.4.7

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.7`

## 6.4.6

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.6`

## 6.4.5

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.5`

## 6.4.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.4`

## 6.4.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.3`

## 6.4.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.2`

## 6.4.1

### Patch Changes

- **📚 Docs** — Getting Started now leads each plugin README, with the ESLint install line and a flat config that loads

  The install block was below the Description and the doctrine, and on 17 of the 31 plugins there was no flat-config snippet on the page at all. `eslint-plugin-secure-coding`'s README showed `...securePlugin.configs.recommended`, which throws `TypeError: ... is not iterable` when pasted, because `configs.recommended` is one object. Every plugin README now opens with `npm install --save-dev eslint <plugin>` and `import { configs } from '<plugin>'` and `export default [configs.recommended]` in an `eslint.config.mjs`, then the Description. A test now loads that snippet in ESLint for every plugin.

  The star banner above the first heading, the footer block with the star counter and the Dev.to ask are replaced by one `## Support` paragraph at the end: report a false positive, or star the repo if the plugin helped.

  `eslint-plugin-import-next` opens with its drop-in grade, read from the newest `benchmarks/results/ilb-import-parity` result with its date: passes 2,035 of 2,135 (95.3%) of eslint-plugin-import 2.32.0's own test cases, measured 2026-11-19.

  Eight taglines now say what the plugin flags instead of "security rules for X" (secure-coding, node-security, browser-security, nestjs-security, express-security, vercel-ai-security, react-a11y, import-next). `eslint-plugin-node-security` adds one proof line: the public repositories that list it, with the date they were checked.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.1`

## 6.4.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.4.0`

## 6.3.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.3.0`

## 6.2.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.2.0`

## 6.1.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.1.3`

## 6.1.2

### Patch Changes

- **🐛 Fix** — no-sensitive-data-exposure reports a secret VALUE, not a credential word in the prose

  A label in front of a value the rule cannot name — `token: ${t}`,
  `'password: ' + value`, `Using resumption token: ${eventId}`,
  `Token: ${url}api/auth/mcp/token` — is no longer reported on the label alone.
  The value must name the secret itself (an identifier, property or object key,
  one binding hop or a local object literal away), or a string literal must write
  one out (`'password: hunter2'`). A label and its value must also sit on one line,
  so help text naming an environment variable is not a credential.

  On the MCP TypeScript SDK's examples this removes four false positives. Logging
  `accessToken`, `user.password` or `{ apiKey }` still reports, and a secret
  aliased into `.message` through a local object literal is now caught with no
  label at all.

  Docs: nine rule docs named a template CWE-693 in their header or front matter;
  they now name the rule's own CWE.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.1.2`

## 6.1.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.1.1`

## 6.1.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.1.0`

## 6.0.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.0.2`

## 6.0.1

### Patch Changes

- **🧹 Chore** — complete the npm metadata in every package manifest

  Every manifest declares `"sideEffects": false`; no module changes state outside itself when it is loaded, so a bundler may drop what it does not use. The `funding` field is removed: it pointed at the source repository, not at a funding page, so `npm fund` led nowhere useful. Each `oxlint-plugin-*` alias also declares an `exports` map (`.` and `./index.js`, each with `types` first, and `./package.json`); every path that resolved before still resolves. No code changes.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.0.1`

## 6.0.0

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

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@6.0.0`

## 5.6.5

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.5`

## 5.6.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.4`

## 5.6.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.3`

## 5.6.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.2`

## 5.6.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.1`

## 5.6.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.0`

## 5.5.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.5.1`

## 5.5.0

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

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.5.0`
