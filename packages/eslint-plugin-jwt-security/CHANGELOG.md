# eslint-plugin-jwt-security

All notable changes to `eslint-plugin-jwt-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 3.2.0

### Minor Changes

- **🐛 Fix** — every JWT rule now sees `jwt['sign']` as the same call as `jwt.sign`

  `isJwtLibraryCall` is the single place every rule in this plugin decides whether
  a call is a JWT operation, and it required the callee's property to be an
  Identifier. So `jwt['sign']({ password }, secret)` was not a sign,
  `jwt['verify'](...)` was not a verify, and `jwt['decode'](...)` was not a decode.

  One gate, seven rules reading it, thirteen showing measurably blind cases.

  A dynamic `jwt[m](...)` has no statically known method name, so it is still
  ignored.

### Patch Changes

- **🐛 Fix** — `decoded['exp']` is the same time claim as `decoded.exp`

  A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
  compared `property.name` before asking what the property was. They now resolve
  through the devkit's `propertyName`, which still abstains on the one shape that
  genuinely cannot be resolved: a key chosen at runtime, whose name is not
  statically known.

- **🧹 Refactor** — `no-decode-without-verify` no longer casts an unnameable member

  `SET.has(propertyName(node) as string)` reaches the right answer for the wrong
  reason. `propertyName` returns `string | null` because `o[k]` names a property
  the AST cannot read, and that is not the same answer as "named, and not one of
  these" — the cast collapses both, and `Set.prototype.has(null)` being false is
  what made it look correct.

  2 sites across 1 file now ask the two questions separately, via
  `namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

  No rule behaviour changes: this package's test count and coverage are unchanged.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.0`

## 3.1.1

### Patch Changes

- **🐛 Fix** — Add an install-size badge to the README prelude, linking to each package's packagephobia page. npm renders the README from the last publish, so a badge only appears on npmjs.com after a release.

  Install size rather than bundle size: bundlephobia measures a browser bundle,
  and nobody bundles an ESLint plugin into one, so the number would describe no
  real cost. It was also returning `429` for every package, `react` included.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.2`

## 3.1.0

### Minor Changes

- **✨ Feature** — **🐛 Fix** — a template literal is a string, in 82 rules that disagreed

  A rule that matched `require('child_process')` did not match
  ``require(`child_process`)``. A rule that matched `res.headers['x-api-key']`
  did not match ``res.headers[`x-api-key`]``. Nothing about the two spellings
  differs at runtime, and no consumer chose one on purpose — which is exactly
  why the miss was invisible: the rule looked correct in its own tests, because
  its tests were written in the same spelling as its implementation.

  Rules across these plugins now read a static string wherever the value is
  statically known: a plain literal, a template literal with no substitutions,
  and a concatenation of either. The same pass fixed computed member access, so
  `o['foo']` is read wherever `o.foo` was.

  **These rules now report on code they previously stayed quiet on.** That is
  the point — the missed spelling was a false negative, not an exemption — but
  a codebase written with backticks may see new findings on upgrade.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.0`

## 3.0.3

### Patch Changes

- **🐛 Fix** — point `meta.docs.url` at documentation that exists ([#683](https://github.com/ofri-peretz/eslint/pull/683))

  `meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
  value is a dead "see docs" link in every consumer's IDE. It was wrong for 319 of
  478 rules, all pointing at `packages/eslint-plugin/` — a package that does not
  exist in this repo.

  `withCanonicalDocsUrls` already existed to fix this, but `docsUrlFor` hardcoded
  the `/docs/security/` path segment, so it could not express the nine quality
  plugins and rollout had stalled at three of twenty-six. The category is now
  derived per plugin, and every documented plugin stamps its rules on export.

- **🐛 Fix** — `no-decode-without-verify` and `require-expiration` no longer report inside test files. ([#685](https://github.com/ofri-peretz/eslint/pull/685))

  On alphagov/govuk-mobile-backend both rules reported a fixture named `fakeJwt`
  signed with `'fake-signing-key'` — a token that exists precisely so a test can
  assert the rule fires. Test files are now skipped.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.2`

## 3.0.2

### Patch Changes

- [#635](https://github.com/ofri-peretz/eslint/pull/635) [`0d30b1c`](https://github.com/ofri-peretz/eslint/commit/0d30b1c1b900c4664b7f67aebb87c6e5ee9f6bf4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Five false positives that would have shipped a false claim.

  The 2026-08-22 adoption-campaign hand-verification run read every finding in
  source before judging it: 8 candidates on open-source repos cloned at HEAD, 7
  false positives. Each of these would have gone to a stranger's repo under our
  name.

  - `jwt/require-algorithm-whitelist` reported a bare `verify(a, b)` in files
    with no JWT in them — LavaMoat's `packages/harden` twice, and shardeum's
    `debugMiddleware.ts`, where it is a Shardus ed25519 signature check. The
    callee's own binding is now resolved: a local declaration, or a binding to a
    non-JWT specifier, is not a JWT call.
  - `secure-coding/no-hardcoded-credentials` rated a public EVM address CVSS 9.8
    "Hard-coded Secret key". `0x` + exactly 40 hex is the published half by
    construction; a 64-hex private key still reports.
  - `node-security/no-weak-hash-algorithm` reported an X.509 certificate
    thumbprint, which Azure AD/MSAL mandates as the SHA-1 `x5t` header, and a
    log-correlation ticket whose only security signal was the word `sign` in the
    enclosing RPC method's name.
  - `node-security/no-math-random-crypto` fired six times on one log-ticket
    idiom, reading `hash` and `code` out of JSON-RPC method names one and two
    function boundaries away from the draw.
  - `secure-coding/no-missing-authentication` flagged `get('/is-alive')` at CVSS
    9.8. A liveness probe is unauthenticated on purpose.

  Every fix carries a lock that fails on the unfixed rule, and a positive control
  that fails if the rule stops detecting the real thing.

- Updated dependencies [[`3854526`](https://github.com/ofri-peretz/eslint/commit/38545268c6028267787a1cb7c0a7e065babad99c), [`16bae7b`](https://github.com/ofri-peretz/eslint/commit/16bae7ba0451ed19757231be60b8ed88abb35d9e), [`5e0e029`](https://github.com/ofri-peretz/eslint/commit/5e0e029acc7ad5877c915d56bea5f4f707983fe6), [`d81469f`](https://github.com/ofri-peretz/eslint/commit/d81469fa2921043b44b1f042e23cb9148ae72c04), [`a22fd9b`](https://github.com/ofri-peretz/eslint/commit/a22fd9b7755f3988739f9d67a7c209b77836612a), [`6f9124e`](https://github.com/ofri-peretz/eslint/commit/6f9124e5e29a7cf7c5e0dde3127bcf219c1538d7)]:
  - @interlace/eslint-devkit@1.17.0

## 3.0.1

### Patch Changes

- [#563](https://github.com/ofri-peretz/eslint/pull/563) [`20b22aa`](https://github.com/ofri-peretz/eslint/commit/20b22aab4cf3f49f9c3f72b8235550b55db92fb8) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-xpath-injection` now needs evidence rather than names, and every rule carries a CVSS.

  **`no-xpath-injection`** had a false positive and a false negative in the same rule. It
  reported `const QueryValidateSchema = QueryInputSchema` — a Zod schema in a file with no
  XPath — because the declaration name contained "query" and the initialiser name contained
  "query" and "input". It stayed silent on
  `xpath.select("//user[@id='" + id + "']", doc)` because `id` is not in its taint-name list,
  even though the string is XPath, the sink is proven, and part of the expression is dynamic.
  A declaration must now reach an evaluator, and a proven sink is evidence in its own right.
  Concatenations are also flattened and reported once at the outermost node instead of at
  every nesting level. Measured across 20 open-source projects: 66 findings down to 42.

  **CVSS coverage goes from 80/121 rules to 121/121.** `formatLLMMessage` already enriched
  from `CWE_MAPPING`; the table was missing 30 of the CWEs the rules declare. Lookup now also
  tolerates zero-padded ids (`CWE-020` matches `CWE-20`), and 24 rules whose documented CVSS
  disagreed with the class score now follow the sourced table.

- Updated dependencies [[`20b22aa`](https://github.com/ofri-peretz/eslint/commit/20b22aab4cf3f49f9c3f72b8235550b55db92fb8)]:
  - @interlace/eslint-devkit@1.16.0

## 3.0.0

### Major Changes

- [#548](https://github.com/ofri-peretz/eslint/pull/548) [`d86a8d8`](https://github.com/ofri-peretz/eslint/commit/d86a8d8de3e6fa4c404192365a7aa66c9646233d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-algorithm-none` no longer reports decoding, and the whole plugin now works
  in CommonJS.

  **Breaking:** `no-algorithm-none` no longer emits `decodeWithoutVerify`. That
  site belongs to `no-decode-without-verify`, which reports it with its own
  severity, its own docs and its own fix — the two rules were reporting the same
  line for the same reason. Enable `no-decode-without-verify` (it is in
  `recommended`) and drop any suppression that named `decodeWithoutVerify` on
  `no-algorithm-none`.

  **The plugin was silent on CommonJS.** Its module gate read `ImportDeclaration`
  only, so `const jwt = require('jsonwebtoken')` — and `import jwt =
require(...)`, `require('jsonwebtoken').decode`, a destructured require, a
  side-effect require — left every rule switched off. It now resolves the
  specifier for each of those spellings.

  Two false-positive classes went with it:

  ```js
  new TextDecoder().decode(bytes); // not JWT decoding
  await new SignJWT(claims).setExpirationTime('2h').sign(key); // does set an expiry
  ```

  The gate now checks the receiver against a list of non-JWT constructors, and
  `require-expiration` follows jose's fluent builder through the chain instead of
  looking only at the object literal. `FlattenedSign`, `CompactSign` and
  `GeneralSign` are exempt outright — JWS has no `exp` claim to set.

### Patch Changes

- Updated dependencies [[`d86a8d8`](https://github.com/ofri-peretz/eslint/commit/d86a8d8de3e6fa4c404192365a7aa66c9646233d)]:
  - @interlace/eslint-devkit@1.14.0

## 2.4.0

### Minor Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Presets now emit rule ids prefixed with the package's own name, so registering
  the plugin under that name works.

  Both packages were renamed (`eslint-plugin-jwt` → `eslint-plugin-jwt-security`,
  `eslint-plugin-pg` → `eslint-plugin-postgresql-security`) but their presets kept
  emitting the pre-rename `jwt/` and `pg/` prefixes. Registering under the package
  name — the shape every README shows — failed outright:

  ```
  A configuration object specifies rule "jwt/no-algorithm-none",
  but could not find plugin "jwt".
  ```

  `configs.recommended` / `flagship` / `strict` now emit `jwt-security/…` and
  `postgresql-security/…`. The legacy keys (`jwt`, `pg`) stay registered in each
  preset's `plugins` block for a deprecation window, so a config that already
  writes the old rule ids alongside these presets keeps resolving. They are
  removed in the next major.

  If you spread `…configs.recommended.rules` and register the plugin yourself,
  register it under the package name (`'jwt-security'` / `'postgresql-security'`).
  Spreading the whole config object needs no change.

### Patch Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-decode-without-verify`: detect jose's `decodeJwt`, and apply the
  foreign-import gate to chained receivers.

  The reported false positive ("matches any method named `decode`") no longer
  reproduces — the SDK-evidence gate landed since the report. Measured over the
  8-repo corpus, the rule produces **1 finding**, and it is a true positive
  (`twilio/twilio-node` `src/auth_strategy/TokenAuthStrategy.ts:49`, a genuine
  `jsonwebtoken` decode). Both cited shapes are now locked as `valid` fixtures:

  - `file.content = file.decode(raw)` — Shopify/cli's TOML parser, no JWT
    library imported in the file.
  - `sdk.token.decode(accessToken)` — okta/okta-auth-js
    `lib/oidc/handleOAuthResponse.ts:109`; that file imports only relative paths.

  Verifying those locks surfaced two real defects, both fixed here:

  - **jose's decode went unreported.** The method set listed `decodeJWT`, an
    all-caps spelling no JWT library ships. jose's actual export is `decodeJwt`
    (`Object.keys(require('jose')).filter(k => /decode/i.test(k))` →
    `['decodeJwt', 'decodeProtectedHeader']`), so every `decodeJwt(token)` call
    was a false negative despite jose being a listed library.
    `decodeProtectedHeader` is deliberately not added: reading the header to pick
    a key before verifying is the documented jose flow, and `allowHeaderInspection`
    already covers it.

  - **The foreign-import gate skipped chained receivers.** It read
    `callee.object` and required an `Identifier`, so `sdk.token.decode(t)` — whose
    receiver is itself a MemberExpression — was never checked against the file's
    imports at all. It now walks to the root of the chain. This is the same shape
    the gate was built for (`argon.verify(...)` in a file that also imports
    `jsonwebtoken`), one member deeper.

## 2.3.4

### Patch Changes

- [#475](https://github.com/ofri-peretz/eslint/pull/475) [`db73308`](https://github.com/ofri-peretz/eslint/commit/db7330857b4669b4ed325dc561f46f82905c56ba) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Stop matching JWT method names on files and receivers that have nothing to do with JWTs

  `sign`, `verify` and `decode` are among the most common method names in
  JavaScript, and every rule in this plugin matched them on name alone. Measured
  over 102 open-source repositories, that reported:

  - `new TextDecoder('gbk').decode(data)` — buqiyuan/nest-admin
  - `textDecoder.decode(slice)` — the-mirror
  - `argon.verify(user.hash, dto.password)` — argon2 password verification, vladwulf/nestjs-jwts

  None involves a JWT. Two gates now apply, both using only local evidence:

  1. **The file must import a JWT library** (`jsonwebtoken`, `jose`, `@nestjs/jwt`,
     `express-jwt`, `jwks-rsa`, `jwt-decode`), compared on the package root so
     subpath imports like `jose/jwt/verify` still count.
  2. **A receiver explicitly imported from a non-JWT package is rejected** — the
     file gate alone is not enough, because a JWT tutorial imports `jsonwebtoken`
     _and_ `argon2`.

  Neither gate requires the receiver to trace back to a JWT import, since a JWT
  client is usually injected rather than constructed from one; demanding that
  would trade this false-positive class for a false-negative one.

  Affects all nine rules that go through `isJwtLibraryCall`.

- Updated dependencies [[`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617)]:
  - @interlace/eslint-devkit@1.12.0

## 2.3.3

### Patch Changes

- [#407](https://github.com/ofri-peretz/eslint/pull/407) [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

  `context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
  fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
  resolved cleanly and then every rule threw
  `Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
  nothing, because the manifest claimed the version was supported.

  Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
  9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
  changes; this only makes the manifest match what the code can actually run.

- [#329](https://github.com/ofri-peretz/eslint/pull/329) [`75d3497`](https://github.com/ofri-peretz/eslint/commit/75d349787f8ec081ae961cc4984ea4973c8be730) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Test infrastructure only — no rule, config, or API behavior changes. These
  packages ship `src/` in their npm tarball, so the moved SDK compatibility specs
  technically alter the published files, hence the patch bump.

  The `src/__compatibility__/` suites no longer run as part of each package's
  default `vitest` run. They assert the export surface of the third-party SDK
  (express, jose, @middy/core, mongodb, @nestjs/common, pg, ai), not our rules, and
  `sdk-compatibility.yml` already exercises them against each SDK's `@latest` —
  the only run that produces new signal. Loading those SDK graphs on a cold module
  cache was measured at 82s (express) and 209s (`@nestjs/common`), which blew every
  per-file hook timeout and blocked unrelated local commits via the lefthook
  `tests-affected` pre-commit hook. The ceiling now lives once in
  `vitest.compat.config.mts`, sized off those cold numbers.

- [#423](https://github.com/ofri-peretz/eslint/pull/423) [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the ESLint peer range shown in the README Compatibility table.

  The manifest floor moved to 8.40.0, but every package README still advertised
  `^8.0.0 || ^9.0.0 || ^10.0.0`. The README is what npm renders on the package
  page, so the requirement consumers actually read disagreed with the one npm
  enforced: an install on 8.39.x warns about a peer conflict while the README
  says that version is supported.

  The range was missed by the original sweep because a markdown table escapes
  the union as `\|\|`, so a grep for the plain shape matched none of the 29
  files.

  Also updates `.agent/rules/readme-structure.md` and
  `.agent/compatibility-matrix.md`, which template this table for new packages,
  and adds a README-vs-manifest assertion to
  `scripts/__tests__/eslint-peer-floor.test.ts` so the two cannot drift again.

- [#414](https://github.com/ofri-peretz/eslint/pull/414) [`d527f14`](https://github.com/ofri-peretz/eslint/commit/d527f1485512db5441aa269e207d1b7510bf29bb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Remove the superseded `eslint-plugin-pg` and `eslint-plugin-jwt` sources from
  the monorepo.

  Both were renamed to their `-security` names and every published version on npm
  is deprecated. The sources stayed in `packages/`, and because
  `.changeset/config.json` has `ignore: []`, **every release versioned and
  republished them** — `eslint-plugin-pg@1.4.13` and `eslint-plugin-jwt@2.2.13`
  went out on 2026-08-05. A newly published version carries no deprecation flag,
  so each release silently un-deprecated the packages until someone re-ran
  `npm deprecate`.

  Deleting the sources is what stops that loop; re-deprecating alone gets undone
  by the next release.

  No published rule is lost. The `-security` packages carry identical rule sets
  (13 each, verified by comparing the rule directories) and keep the original
  `pg/` and `jwt/` rule namespaces, so no consumer config changes. The published
  catalogue is unchanged at 465 rules across 30 plugins — the removed entries were
  already marked unpublished, which is why the totals only drop for the
  including-unpublished count (491 → 465).

  Also fixes a user-facing consequence the removal surfaced: the playground's
  copy-config button derived package names as `eslint-plugin-<prefix>`, so `jwt/`
  and `pg/` findings emitted install lines for the **deprecated** packages. Those
  two prefixes are now mapped explicitly, with a lock.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 2.3.2

### Patch Changes

- [#411](https://github.com/ofri-peretz/eslint/pull/411) [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Ship the JavaScript without tsc's layout.

  Every emitted `.js` is re-written through esbuild's `minifyWhitespace`, which
  removes indentation and line breaks. Across the ecosystem that is 3233 kB ->
  2023 kB of shipped JavaScript, a 37% cut; on disk a package install drops about
  28%. Indentation alone was ~32% of a compiled rule file.

  This is deliberately NOT minification. Identifiers keep their names, string
  contents are untouched, and the syntax tree is not rewritten — rule `meta`
  (messages, schema, docs URLs) stays byte-identical, which is what the docs site
  and `--print-config` read, and a stack trace from inside a rule still names
  the function it came from. Full mangling would have bought another 4 kB gzipped
  and cost both.

  Verified against the published artifact: identical lint findings including
  message IDs, identical rule names, and zero differences across every rule's
  meta, messages, schema and presets.

- Updated dependencies [[`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa), [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31)]:
  - @interlace/eslint-devkit@1.10.0

## 2.3.1

### Patch Changes

- [#377](https://github.com/ofri-peretz/eslint/pull/377) [`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Complete the logo row across every published package.

  The six AI SDK family plugins landed after the logo row shipped, so they had no
  marks; @interlace/eslint-devkit never had a header row at all. All of them now
  carry Interlace -> ecosystem -> oxlint -> ESLint (devkit has no ecosystem mark).

  The four AI SDK READMEs are also brought to the canonical structure they were
  missing: Philosophy, Getting Started, Configuration Presets, Compatibility,
  Related Plugins, and the 11-column rule table with the type-awareness column.

  README-only change; no rule behaviour is affected. The patch bump is what
  carries the new README onto npm, which only refreshes a package README on
  publish.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix SDK peer declarations that npm silently ignored

  Twelve plugins listed their target SDKs under `peerDependenciesMeta` with
  `{"optional": true}` but never declared them in `peerDependencies`. npm drops
  any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
  so the metadata was inert — these packages effectively declared **no SDK peer
  at all**. Nothing warned: the failure mode of a dependency you never declared
  is silence.

  Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
  `eslint-plugin-mongodb-security` already use — a supported major range in
  `peerDependencies`, `optional: true` in `peerDependenciesMeta`:

  | Plugin               | SDK                              | Range                                        |
  | :------------------- | :------------------------------- | :------------------------------------------- |
  | `express-security`   | `express`                        | `^4.0.0 \|\| ^5.0.0`                         |
  |                      | `helmet`                         | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`             |
  |                      | `cors`                           | `^2.0.0`                                     |
  |                      | `csurf`                          | `^1.0.0`                                     |
  |                      | `express-rate-limit`             | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
  | `jwt`                | `jsonwebtoken`                   | `^8.0.0 \|\| ^9.0.0`                         |
  |                      | `@nestjs/jwt`                    | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `express-jwt`                    | `^7.0.0 \|\| ^8.0.0`                         |
  |                      | `jose`                           | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `jwks-rsa`                       | `^3.0.0 \|\| ^4.0.0`                         |
  |                      | `jwt-decode`                     | `^3.0.0 \|\| ^4.0.0`                         |
  | `lambda-security`    | `@aws-sdk/client-lambda`         | `^3.0.0`                                     |
  |                      | `@middy/core`                    | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-cors`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-security-headers`   | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/validator`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `maintainability`    | `typescript`                     | `>=4.8.4`                                    |
  | `nestjs-security`    | `@nestjs/common`                 | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `@nestjs/throttler`              | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `class-validator`                | `^0.14.0 \|\| ^0.15.0`                       |
  |                      | `class-transformer`              | `^0.5.0`                                     |
  | `react-features`     | `typescript`                     | `>=4.8.4`                                    |
  | `vercel-ai-security` | `ai`                             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `jwt-security`       | same six as `jwt`                | (identical ranges)                           |
  | `openai-security`    | `openai`                         | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@openai/agents`                 | `>=0.1.0 <1.0.0`                             |
  | `anthropic-security` | `@anthropic-ai/sdk`              | `>=0.1.0 <1.0.0`                             |
  |                      | `@anthropic-ai/claude-agent-sdk` | `>=0.1.0 <1.0.0`                             |
  | `gemini-security`    | `@google/genai`                  | `^1.0.0 \|\| ^2.0.0`                         |
  | `mcp-sdk-security`   | `@modelcontextprotocol/sdk`      | `^1.0.0`                                     |

  Ranges were taken from each SDK's real release history, bounded below by the
  oldest major whose call shape the rules still match and above by the current
  major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
  only ever shipped one usable major. The `ai` range spans v4 because
  `require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
  v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
  `@interlace/eslint-devkit` already declares, since these are the same
  type-aware-graceful rules behind the same optional TS program.

  Every range admits the version this repo's `__compatibility__` specs are
  actually tested against, so the declaration cannot drift from what CI proves.

  The four SDKs still on `0.x` (`@openai/agents`, both Anthropic packages) use an
  explicit `>=0.1.0 <1.0.0` rather than a caret, because `^0.115.0` resolves to
  `>=0.115.0 <0.116.0` — a range narrow enough to warn on almost every real
  install. These rules match on call shape and never import the SDK, so the
  honest constraint is the pre-1.0 line, not a single minor.

  `peer-declaration-integrity.test.ts` now locks the invariant across every
  workspace package: a `peerDependenciesMeta` key with no `peerDependencies` twin
  fails the suite and is named in the diff. This class had already been fixed
  once, in a commit that never merged — nothing went red in its absence, so the
  bug came back on four newly published packages. A silent failure needs a lock,
  not review attention.

  **Nothing to migrate.** Every entry stays optional, so no install adds a
  package or emits a warning when the SDK is absent. What changes is that a
  consumer on an unsupported major now gets a peer warning instead of nothing —
  which was the point of the metadata in the first place.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 2.2.9

### Patch Changes

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 2.2.8

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 2.2.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 2.2.6

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 2.2.5

### Patch Changes

- [#213](https://github.com/ofri-peretz/eslint/pull/213) [`391dbe6`](https://github.com/ofri-peretz/eslint/commit/391dbe6b39f78d549379218567cb959649f8c614) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Align every security rule's `meta.docs.cvss` to the CVSS its finding actually
  emits. The emitted machine-readable message sources its `CVSS:x` from
  `CWE_MAPPING` via `formatLLMMessage` → `enrichFromCWE`, but the static
  `meta.docs.cvss` documentation field had drifted on 45 rules across these 7
  plugins — e.g. `no-hardcoded-credentials` documented `9.5` while emitting
  `CVSS:9.8` (the value the published article and SARIF/LLM consumers already
  read).

  This corrects the **documentation metadata only** — no emitted finding changes.
  Locked by `security-cvss-docs-consistency.lock.test.ts` (cross-plugin: every
  security rule's `meta.docs.cvss` must equal the CVSS it emits), the
  `no-hardcoded-credentials` rule lock (real ESLint `Linter` emission), and a
  devkit `enrichFromCWE` contract test pinning `CWE-798 → 9.8`.

  Follow-up (not in scope): 50 security rules document a CVSS that never appears
  in any emitted message (their messages carry no CWE), and several rules emit the
  generic CWE score where a rule-specific score may be warranted — both change
  emitted output and are separate decisions.

## 2.2.4

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 2.2.3 — 2026-02-08

## 2.2.2 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 2.2.1 — 2026-02-02

This was a version bump only for eslint-plugin-jwt-security to align it with other projects, there were no code changes.

## 1.0.0 — 2025-12-29

### Added

#### Core Security Rules (7)

- `no-algorithm-none` - Prevent `alg:"none"` attack (CVE-2022-23540, CWE-347)
- `no-algorithm-confusion` - Prevent RS256→HS256 key confusion (CWE-347)
- `require-algorithm-whitelist` - Require explicit algorithm specification (CWE-757)
- `no-decode-without-verify` - Prevent trusting decoded payloads (CWE-345)
- `no-weak-secret` - Require 256-bit minimum secrets (CWE-326)
- `no-hardcoded-secret` - Prevent secrets in source code (CWE-798)
- `require-expiration` - Require `exp` claim or `expiresIn` (CWE-613)

#### 2025 Research Rules (6)

Based on LightSEC 2025 "Back to the Future" attack research:

- `require-issued-at` - Require `iat` claim for freshness (CWE-294)
- `require-issuer-validation` - Require issuer validation (CWE-287)
- `require-audience-validation` - Require audience validation (CWE-287)
- `no-timestamp-manipulation` - Prevent `noTimestamp: true` (CWE-294)
- `require-max-age` - Require maxAge for replay prevention (CWE-294)
- `no-sensitive-payload` - Prevent PII in token payload (CWE-359)

#### Configuration Presets

- `recommended` - Balanced security (critical=error, high=warn)
- `strict` - Maximum security with all 13 rules enabled
- `legacy` - Migration mode with only critical rules

#### Library Support

- jsonwebtoken
- jose
- express-jwt
- @nestjs/jwt
- jwks-rsa
- jwt-decode

### Features

- AI-optimized error messages using `formatLLMMessage`
- CWE references for all rules (9 CWEs covered)
- OWASP Top 10 2021 coverage matrix (6 categories)
- Full TypeScript support
- Comprehensive test coverage (248 edge case tests)
