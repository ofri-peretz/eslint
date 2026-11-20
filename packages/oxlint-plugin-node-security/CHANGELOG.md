# oxlint-plugin-node-security

All notable changes to `oxlint-plugin-node-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 6.1.0

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.1.0`

## 6.0.7

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.7`

## 6.0.6

### Patch Changes

- **🐛 Fix** — no-timing-unsafe-compare drops dead separator spellings of the token compounds

  `api_token`, `x-session-token` and similar already match the whole-word
  `token` default, because a separator is a word boundary. So the `_` and `-`
  spellings of `apiToken`, `sessionToken`, `idToken` and `csrfToken` (added in
  PR 1581, not yet published) matched nothing the rule did not already match.
  The camelCase compounds stay: they catch a lowercase `apitoken`. No behaviour
  change.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.6`

## 6.0.5

### Patch Changes

- **📚 Docs** — eight doc defects found by Codacy's reviewer, and every doc's CWE and severity now match the rule

  Codacy renders these docs from the release tag (codacy/codacy-eslint#5025).

  - `no-unsafe-buffer-alloc`: a one-argument `copy`/`set`/`write` from a source
    shorter than the buffer leaves the tail uninitialized. The rule accepts it as
    covering; that is now documented as a known false negative, and the safe
    examples size from the source or send only `buf.subarray(0, written)`.
  - `no-toctou-vulnerability`: the suggested fix was `access()` then
    `readFile()`, the race itself. It is now one `open` (with `O_NOFOLLOW` or
    `'wx'` as the case needs) and an `ENOENT` handler.
  - `no-ssrf`: the safe example allowlisted a hostname and never checked where it
    resolved. It now resolves, rejects private, loopback and link-local
    addresses, and pins the socket to the checked address.
  - `detect-non-literal-fs-filename`: `startsWith(baseDir)` accepted
    `/safe-dir-evil`. Containment is now `path.relative`-based, with a realpath
    check for symlinks.
  - `no-static-iv`: the AES-GCM example dropped the auth tag. It now stores
    `getAuthTag()` with the nonce and calls `setAuthTag()` on decrypt.
  - `detect-child-process`, `detect-non-literal-fs-filename`, `no-buffer-overread`,
    `no-zip-slip`: a template `CWE-693` header replaced by the rule's CWE.
    Front-matter `cwe` and `severity` now match each rule's meta and CVSS band
    across all node-security docs.
  - `lock-file`: "npm, yarn, or npm" now reads "npm, yarn, or pnpm", the schema's
    enum.

- **🐛 Fix** — three false positives found scanning the MCP TypeScript SDK examples and tolaria

  - `no-timing-unsafe-compare`: a secret pattern shorter than six letters (`token`,
    `auth`, `hash`, `jwt`, …) now matches only as a whole word of the identifier,
    so `grantedMaxTokens === params.maxTokens` (a count of LLM tokens) is no longer
    a timing oracle. `accessToken`, `x_auth_token` and `JWTValue` still match;
    `authorization` and lowercase-safe compounds (`apiToken`, `sessionToken`,
    `idToken`, `csrfToken`) are default patterns of their own. A pattern with regex
    syntax keeps substring semantics.
  - `no-unsafe-buffer-alloc`: `Buffer.allocUnsafe(n)` filled by `fs.readSync(fd, buf, 0, …)`
    or an awaited `handle.read(buf, 0, …)` on a handle from `fs/promises` `open()`,
    whose count is never rewritten, and then read only through
    `subarray(0, count)`, `slice(0, count)` or `toString(enc, 0, count)` is no
    longer reported — the uninitialized tail is never looked at. Any other read,
    bound or offset still reports.
  - `no-dynamic-command-string`: a parameter of a file-local, unexported function
    whose every call passes a string literal (`commandPath('axe')`) is treated as a
    constant, like a `const`. `no-shell-injection` does not follow parameters, and
    its docs now say why.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.5`

## 6.0.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.4`

## 6.0.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.3`

## 6.0.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.2`

## 6.0.1

### Patch Changes

- **🧹 Chore** — complete the npm metadata in every package manifest

  Every manifest declares `"sideEffects": false`; no module changes state outside itself when it is loaded, so a bundler may drop what it does not use. The `funding` field is removed: it pointed at the source repository, not at a funding page, so `npm fund` led nowhere useful. Each `oxlint-plugin-*` alias also declares an `exports` map (`.` and `./index.js`, each with `types` first, and `./package.json`); every path that resolved before still resolves. No code changes.

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.1`

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

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.0`

## 5.8.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.4`

## 5.8.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.3`

## 5.8.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.2`

## 5.8.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.1`

## 5.8.0

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

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.0`
