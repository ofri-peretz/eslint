# eslint-plugin-supabase-security

All notable changes to `eslint-plugin-supabase-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 1.1.0

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

## 1.0.0

### Major Changes

- **💥 Breaking** — 1.0.0, stable Supabase security rules checked against real code

  1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

  Fail-closed auth handling (the identity guarded, optional-chained, short-circuited or returned) and RPC names chosen from a closed set are no longer reported. `createBrowserClient` and the auth-helpers browser factories, SvelteKit public env, hardcoded `service_role` keys, `.then` chains, and public buckets configured through a const or spread are now checked.

  Full audit: `benchmarks/audits/2026-10-12-fp-fn-supabase-security.md`.

  ## Migration

  No configuration change is needed. Rule names, options and presets are unchanged:

  ```js
  import plugin from 'eslint-plugin-supabase-security';

  export default [plugin.configs.recommended];
  ```

  The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.20.0`

## 0.2.0

### Minor Changes

- **✨ Feature** — **✨ New** — `eslint-plugin-supabase-security`, four rules for the Supabase client.

  `no-service-role-key-in-client` is why the package exists: `service_role` bypasses Row Level Security completely, and the line that leaks it into a browser bundle is indistinguishable from every other `createClient` call. It reports a service-role variable behind a public env prefix (`NEXT_PUBLIC_`, `VITE_`, …) and one read inside a `'use client'` module, and abstains where the file imports `server-only`.

  Alongside it: `no-dynamic-rpc-name` (a computed `.rpc()` name lets the caller pick which Postgres function runs), `require-auth-error-check` (`getUser()` reports a forged token by returning `error`, not by throwing, so destructuring only `data` reads a failure as an anonymous success), and `no-public-storage-bucket` (`strict` only — a public bucket is sometimes intended).

  Every rule gates on a `@supabase/*` import, because `.rpc()`, `.auth` and `createBucket()` are ordinary member names.

  The devkit registers `plugin-supabase-security` in `PLUGIN_DOCS_CATEGORY`. Without it every rule in the new plugin ships with no `meta.docs.url`, which is a "see docs" link that 404s in every IDE, CI report and SARIF file — the devkit warns about the gap at build time rather than guessing a category.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.3`
