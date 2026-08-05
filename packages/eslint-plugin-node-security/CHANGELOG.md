## 4.8.0

### Minor Changes

- [#401](https://github.com/ofri-peretz/eslint/pull/401) [`94d8448`](https://github.com/ofri-peretz/eslint/commit/94d84480f3c2633258402ba7627c627a5a1823fc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-non-literal-fs-filename` now resolves the fs binding instead of matching
  one spelling of it.

  The gate required the receiver be literally the identifier `fs`, so a named
  import from `node:fs/promises`, a renamed default import, a namespace import,
  `fs.promises.*` and a destructured `require` were all silently unchecked — the
  rule's own documentation used `const { readFile } = require('fs')` as its first
  incorrect example, a shape it never reported. All of those are now checked, and
  bindings are resolved across the whole file before any call is judged, so a
  `require` below its call site counts too.

  Detection is strictly wider, so expect more findings. Because of that,
  `detect-non-literal-fs-filename` drops from `error` to `warn` in the
  `recommended` preset: measured on the ecosystem repo the widened rule reports
  854 findings (555 outside test files), and it has no notion of a trust
  boundary — a build script reading its own repo reports identically to a request
  handler reading user input. Set it back to `error` explicitly if you want the
  old severity; it will be reconsidered once the corpus run measures its
  false-positive profile.

### Patch Changes

- Updated dependencies [[`6f5f164`](https://github.com/ofri-peretz/eslint/commit/6f5f164c7461d66f17689039d19fa9d7d84111ef), [`5980f89`](https://github.com/ofri-peretz/eslint/commit/5980f89a65113e43d504ecc72a86d61aa1e522cb), [`81acd9c`](https://github.com/ofri-peretz/eslint/commit/81acd9ca270940529b455fbfa685b842b8cfe982), [`8e238ea`](https://github.com/ofri-peretz/eslint/commit/8e238ea3a7f18aa47c6d02368c6023d8575deca4), [`0cbcc46`](https://github.com/ofri-peretz/eslint/commit/0cbcc46f89258c888de7354cf24b90c316df43b0)]:
  - @interlace/eslint-devkit@1.9.0

## 4.7.3

### Patch Changes

- [#383](https://github.com/ofri-peretz/eslint/pull/383) [`868c4a8`](https://github.com/ofri-peretz/eslint/commit/868c4a857e26b632741374e34401e55246daf01e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Document every rule option, and add `description` to the schemas that had none

  282 working options across 123 rules had no row in their rule's Options table,
  and 62 rule docs had no Options section at all. An option nobody can find is,
  in practice, an option that does not exist — the only difference from a dead
  one is that the code is there.

  Schema descriptions are now the source of truth, so editors and any tooling
  that reads `meta.schema` get them too, not just the docs site. 75 options that
  had no description anywhere got one written from their own default value and
  the rule's stated purpose.

  Rule behaviour is unchanged. This is documentation plus schema `description`
  metadata; no detection, option name, or default was touched.

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Load rule modules on demand instead of at plugin load.

  Every plugin barrel used to `require` all of its rules the moment ESLint loaded
  the plugin, whether or not your config enabled them. `plugin.rules[id]` is only
  ever read for rules a config turns on, so the rest was parse-and-compile cost
  for code that never ran.

  The published entry now exposes each rule behind a getter, so a rule module is
  read the first time something asks for it. Measured on a 7-plugin config with 34
  rules enabled: 163 rule modules loaded and 251 ms of plugin load, against 34
  modules and 8.5 ms — total ESLint wall time 251 ms → 109 ms. On a preset that
  enables most of a plugin (`node-security/recommended`, 25 of 37) it is a wash,
  72 ms → 65 ms. It is never slower; the win scales with how many plugins you
  stack and how few of their rules you use.

  Nothing about the plugin API changes. `Object.keys(plugin.rules)` still lists
  every rule without loading any of them, repeated reads return the same object,
  and the `./oxlint` sub-export is the same plugin object it always was.

  `eslint-plugin-jwt` and `eslint-plugin-vercel-ai-security` also re-export their
  rule objects as named top-level exports, which cannot be deferred — those two
  keep loading eagerly.

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Declare what we support, load only what we use

  **`tslib` is gone from every package.** It was a NON-optional peer of
  `@interlace/eslint-devkit`, so all 26 plugins declared it as a dependency to
  satisfy that peer — 124 kB every consumer installed so twelve
  `require("tslib")` calls could resolve. The shipped JavaScript now inlines
  the TypeScript helpers instead (`--importHelpers false` on the emit pass that
  already re-writes it), costing ~9.5 kB in devkit. Zero `tslib` requires remain
  anywhere; verified by installing every plugin with no `tslib` in the tree and
  loading all 26 with every rule intact.

  **`eslint-plugin-import-next` had a phantom dependency.** Its rules
  `require("typescript")` at module load, but it was declared in neither
  `dependencies` nor `peerDependencies` — it worked only because something else
  in the tree happened to install it. A clean install crashed the whole plugin,
  not just the type-aware rules. `typescript` is now a required peer, which is
  what the code actually needs.

  **23 "technologies we support" declarations did nothing.** Seven plugins
  listed their target libraries in `peerDependenciesMeta` with no matching
  `peerDependencies` entry, and npm ignores meta for a package that is not
  declared a peer — verified by installing `eslint-plugin-express-security` and
  watching nothing install and nothing warn. `eslint-plugin-jwt` appeared to
  support six JWT libraries and formally supported none. All 23 are now real
  optional peers, matching the convention `pg`, `mongodb`, `prisma` and the
  other nine already followed:

  | plugin                                                          | technologies now actually declared                                                                    |
  | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
  | `eslint-plugin-jwt`                                             | jsonwebtoken, @nestjs/jwt, express-jwt, jose, jwks-rsa, jwt-decode                                    |
  | `eslint-plugin-lambda-security`                                 | @aws-sdk/client-lambda, @middy/core, @middy/http-cors, @middy/http-security-headers, @middy/validator |
  | `eslint-plugin-express-security`                                | express, helmet, cors, csurf, express-rate-limit                                                      |
  | `eslint-plugin-nestjs-security`                                 | @nestjs/common, @nestjs/throttler, class-validator, class-transformer                                 |
  | `eslint-plugin-vercel-ai-security`                              | ai                                                                                                    |
  | `eslint-plugin-maintainability`, `eslint-plugin-react-features` | typescript                                                                                            |

  All optional, so nothing is installed on the consumer’s behalf — the
  declaration is the supported-technology signal, which is exactly what it was
  meant to be.

  **A new gate compares declared dependencies against what the emitted
  JavaScript actually loads**, in both directions: a `require` with no
  declaration (works until someone installs cleanly) and a declaration nothing
  requires (weight every consumer pays). It understands that a dependency may
  exist to satisfy an optional peer of another dependency, which is why
  `eslint-plugin-import-next` legitimately declares `oxc-resolver` that devkit
  lazily loads.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 4.7.2

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 4.7.1

### Patch Changes

- [#338](https://github.com/ofri-peretz/eslint/pull/338) [`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Re-publish every package so npm carries the optimised artifact

  No source changed. This is a no-op patch whose entire purpose is to ship the
  artifact the current build already produces.

  **Manifests.** `scripts` and `devDependencies` are now stripped from every
  published `package.json`. Neither can do anything in a consumer’s
  node_modules — npm never runs one and never installs the other — but they
  shipped in all 27 manifests, cluttered the npm page, and were read by SCA
  tools scanning installed manifests. No package declares a lifecycle hook, so
  nothing observable changes. Every published package is bumped so this applies
  uniformly rather than to a subset.

  **Tarballs.** 20 packages were last published before the build pipeline
  changed and still ship `AGENTS.md`, `CHANGELOG.md`, JSDoc in the emitted
  `.js`, and the full generated `.d.ts` tree:

  | package                            | published | rebuilt | saving  |
  | ---------------------------------- | --------- | ------- | ------- |
  | `eslint-plugin-react-features`     | 547 kB    | 320 kB  | −227 kB |
  | `eslint-plugin-secure-coding`      | 653 kB    | 477 kB  | −176 kB |
  | `eslint-plugin-conventions`        | 241 kB    | 116 kB  | −125 kB |
  | `eslint-plugin-browser-security`   | 380 kB    | 291 kB  | −89 kB  |
  | `eslint-plugin-maintainability`    | 178 kB    | 116 kB  | −62 kB  |
  | `eslint-plugin-react-a11y`         | 232 kB    | 173 kB  | −59 kB  |
  | `eslint-plugin-reliability`        | 148 kB    | 90 kB   | −58 kB  |
  | `eslint-plugin-vercel-ai-security` | 187 kB    | 130 kB  | −57 kB  |
  | `eslint-plugin-operability`        | 90 kB     | 43 kB   | −47 kB  |
  | `eslint-plugin-jwt`                | 140 kB    | 95 kB   | −45 kB  |
  | `eslint-plugin-modularity`         | 98 kB     | 58 kB   | −40 kB  |
  | `eslint-plugin-nestjs-security`    | 122 kB    | 86 kB   | −36 kB  |
  | `eslint-plugin-sqlite-security`    | 54 kB     | 20 kB   | −34 kB  |
  | `eslint-plugin-sequelize-security` | 54 kB     | 21 kB   | −34 kB  |
  | `eslint-plugin-prisma-security`    | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-mysql-security`     | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-typeorm-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-drizzle-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-knex-security`      | 51 kB     | 19 kB   | −32 kB  |
  | `eslint-plugin-modernization`      | 45 kB     | 38 kB   | −7 kB   |

  Those 20 go from 3428 kB to 2169 kB — **−36.7%**. The remaining
  7 were released after the pipeline change and only gain the manifest strip.

  A new check in `scripts/check-published-artifacts.ts` fails the build if
  `scripts` or `devDependencies` ever reappear in a published manifest, so the
  strip cannot silently regress.

  The dependency ranges did **not** need updating: every plugin pins
  `@interlace/eslint-devkit` with a caret that 1.6.0 satisfies, verified by a
  clean install of an unchanged plugin resolving devkit 1.6.0 with zero
  dependencies and no `typescript` in the tree.

- Updated dependencies [[`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f)]:
  - @interlace/eslint-devkit@1.6.1

## 4.7.0

### Minor Changes

- [#313](https://github.com/ofri-peretz/eslint/pull/313) [`1f4fc05`](https://github.com/ofri-peretz/eslint/commit/1f4fc05b4798020d7ad9f2524256ba4f2bcbb2a9) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eight new rules closing the two fixable gaps found by the F#24/F#26 coverage
  benchmark (CWE Top 25 map + framework-depth matrix).

  **Express — the helmet header family** (the depth gap where SonarJS led 17 rules
  to our 14; `require-helmet` only proved the middleware was mounted, never that
  its protections were still on):

  - `no-disabled-helmet-protections` (CWE-693) — `helmet({ contentSecurityPolicy: false })` and the rest of the disabled-default family, helmet 6 and 7 spellings
  - `require-strict-transport-security` (CWE-319) — HSTS disabled, `max-age` below the 180-day preload floor, or `includeSubDomains: false`
  - `no-unsafe-csp-directives` (CWE-79 / 1021 / 311) — `'unsafe-inline'`, `'unsafe-eval'`, wildcard sources, `frame-ancestors '*'`, missing `frame-ancestors` under `useDefaults: false`, and `upgradeInsecureRequests: null`
  - `no-permissive-trust-proxy` (CWE-348) — `app.set('trust proxy', true)`, which makes `req.ip` client-controlled and every rate-limit bucket forgeable

  **Express — CWE Top 25 (2025) access-control adjacency** (three of the four
  JS-applicable entries we did not cover):

  - `require-route-authentication` (CWE-306) — critical-function routes with no auth middleware and no principal read in the handler
  - `no-client-controlled-authorization` (CWE-863) — `if (req.body.role === 'admin')`: the check runs, and passes for anyone who sets the field
  - `no-idor-resource-access` (CWE-639) — `Invoice.findById(req.params.id)` in a handler that never mentions the caller

  **Node — the fourth adjacency** (CWE-77, generic command injection, previously
  covered only as CWE-78):

  - `no-dynamic-command-string` (CWE-77) — an assembled command string handed to a shell flag (`spawn('bash', ['-c', …])`) or to a command-runner that does not escape (`execaCommand`, `$.raw`)

  In `recommended`, the five structural rules ship as `error`; the three
  access-control rules ship as `warn` — their critical-path / authorization-attribute
  / lookup-method vocabularies are name-based, and naming heuristics never carry
  enforcement severity (plugin scope-audit invariant I3).

### Patch Changes

- Updated dependencies [[`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3), [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3), [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19)]:
  - @interlace/eslint-devkit@1.6.0

## 4.6.0

### Minor Changes

- [#305](https://github.com/ofri-peretz/eslint/pull/305) [`8f1c9ef`](https://github.com/ofri-peretz/eslint/commit/8f1c9efbe99c592f8ed5ffca2d1ed8f53408af19) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - New rule `no-unsafe-buffer-alloc` (CWE-908, Use of Uninitialized Resource) —
  closes a measured coverage gap against `security-node/detect-buffer-unsafe-allocation`
  and `@microsoft/eslint-plugin-sdl/no-unsafe-alloc`.

  It reports `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, both of which
  return memory that was never zeroed, with a suggestion to swap in
  `Buffer.alloc()`. Neither the existing `no-deprecated-buffer` (deprecated
  `Buffer()` constructor, CWE-676) nor `no-buffer-overread` (read-side CWE-126)
  flagged the allocation itself.

  **The rule is unconditional and does no dataflow** — it does not try to prove
  the buffer is fully overwritten before it is read, so a correct
  `allocUnsafe` + `copy` pair is still reported. The one structural exemption is
  `Buffer.allocUnsafe(n).fill(0)`, a parent-node check rather than variable
  tracking. Because of that false-positive profile it ships as `warn` in
  `recommended` rather than `error` (upstream `security-node` ships its
  equivalent off by default).

### Patch Changes

- [#317](https://github.com/ofri-peretz/eslint/pull/317) [`5a8456b`](https://github.com/ofri-peretz/eslint/commit/5a8456b08ffa567be73a66393758ed17805e2fe4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-ssrf`: recognise `needle` as an HTTP client, so `needle.get(req.query.url)` reports. The verb-first `needle('get', url)` form is still not covered — the rule only inspects the first argument.

- Updated dependencies [[`09d2951`](https://github.com/ofri-peretz/eslint/commit/09d2951b3ac74efc9ba49b64e9089d66800b16cc)]:
  - @interlace/eslint-devkit@1.4.4

## 4.5.0

### Minor Changes

- [#310](https://github.com/ofri-peretz/eslint/pull/310) [`28d7898`](https://github.com/ofri-peretz/eslint/commit/28d789896b06dd13ac7c50bcb4aaa36fa5e4be29) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-timing-unsafe-compare` to the `recommended` preset, restoring CWE-697
  coverage.

  `secure-coding/no-insecure-comparison` was removed from every `secure-coding`
  preset, with `node-security/no-timing-unsafe-compare` named as the replacement.
  But that rule was not in any `recommended` preset, so the practical result was
  that **no `recommended` preset anywhere covered CWE-697 timing-unsafe
  comparison**, and the migration note pointed users at a rule they would have had
  to enable by hand — which the note did not say.

  It enters at `'warn'` rather than `'error'`, matching the precedent already set
  by `no-deprecated-buffer` in this preset: adopters shouldn't have CI turn red on
  a version bump. Promote to `'error'` on the next major.

  Note the coverage now lives in a different package than before. A project that
  installs only `eslint-plugin-secure-coding` and relied on its presets for this
  check needs `eslint-plugin-node-security` as well.

  A lock test in `src/index.test.ts` fails if the rule leaves `recommended` again,
  since that would silently make the migration note false.

- [#288](https://github.com/ofri-peretz/eslint/pull/288) [`89bea05`](https://github.com/ofri-peretz/eslint/commit/89bea05c6c48f5f1bdbcc3c87b301d967d962051) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Cut false positives in five security rules, measured against a 1,470-file corpus (webpack `lib/`, lodash, eslint-plugin-import `src/`, and two NestJS boilerplates).

  **`secure-coding/no-hardcoded-credentials` — decide on the value, not the key name.** The rule reported any string in a credential-named slot, so `errors: { password: 'incorrectPassword' }` (an i18n error key) was a CVSS 9.8 finding — 5 of its 10 corpus hits. Detection is now driven by the value's shape: entropy, character-class mix, charset, and a "natural word string" test that rejects identifier- and message-shaped values. A credential-shaped name is still consulted, but only to promote an already-secret-shaped value. Corpus: **10 → 7 findings, and all 7 are true positives** — including two the old logic missed, because a 25-character random `key:` is now found by shape rather than by being on a name allowlist.

  **`secure-coding/no-unsafe-deserialization` — `setTimeout` is not a deserializer.** `await new Promise(resolve => setTimeout(resolve, 1000))` was rated CVSS 9.8 CRITICAL. `setTimeout` / `setInterval` now only report in their implied-`eval` form (string first argument), and calls inside a function named `deserialize` / `unserialize` / `fromJSON` / `fromBuffer` — a class implementing a serialization protocol — are exempt. Corpus: **35 → 4**.

  **`secure-coding/no-graphql-injection` — require real GraphQL syntax.** Any template literal containing a nested brace or the word `type` was a CVSS 9.8 GraphQL injection. Operation and schema keywords must now start a line, schema keywords require a body, and a bare selection set must be the entire string. Concatenations are matched on their reassembled static value rather than on their source text. Corpus: **41 → 0**.

  **`node-security/require-secure-deletion` — only sensitive properties.** The rule fired on every `delete obj.prop`. It now reports only a statically known, sensitive property name (`password`, `token`, `apiKey`, `privateKey`, `sessionId`, …), configurable via the new `additionalSensitiveProperties` option, and understands computed access and optional chaining. Corpus: **25 → 1** (a genuine `delete userDto.oldPassword`).

  **`secure-coding/no-insecure-comparison` — removed from `recommended`, `recommended-strict` and `owasp-top-10`.** It is deprecated in favour of `node-security/no-timing-unsafe-compare`, and its loose-equality half re-reports core `eqeqeq` under a CWE-697 banner — 433 corpus findings, all duplicates. No narrowing fixes that, so the honest change is to stop switching it on for people; it remains exported and available via `strict` or explicit opt-in. Its timing-attack half was also narrowed to match secret keywords on identifier **word segments** instead of substrings of the whole expression text, which stops `if (key === "__non_webpack_require__")` (and `monkey`, `keyword`, `machine`, `author`) from being reported: **443 → 221**.

### Patch Changes

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- [#296](https://github.com/ofri-peretz/eslint/pull/296) [`0c7a208`](https://github.com/ofri-peretz/eslint/commit/0c7a208f568436cc55ac6732641df46e8f44af1f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Cut two false positives confirmed against the benchmark corpus SAFE fixtures.

  **`node-security/no-ssrf`** — the user-input gate only ran when the URL argument
  was a bare identifier, so every other shape reported unconditionally. A Node
  options object built from a helper's own parameters —
  `https.request({ host, path, method: 'GET' })`, from
  `benchmarks/corpus/CWE-444/safe/request-default-parser.js` — was flagged with no
  user data anywhere in the flow.

  The gate now applies to every argument shape and requires evidence: a
  user-input-named identifier standing as the URL, a read off a request object
  (`req` / `request` / `ctx` / `event`), or a template literal or concatenation
  interpolating either. Options-object fields count when they are request-sourced,
  or when a `url` / `href` / `uri` key holds a user-input-named identifier.

  Newly ignored: options objects and interpolations built purely from locals.
  Still reported: `fetch(userUrl)`, `fetch(req.query.url)`,
  `https.request({ host: req.query.host })`, ``fetch(`https://${userHost}/x`)``.

  **`secure-coding/no-hardcoded-credentials`** — `secret: '<your-secret-here>'`
  from `benchmarks/corpus/CWE-798/safe/test-placeholder-values.js` was reported at
  CVSS 9.8. The angle brackets are two character classes, which is all the shape
  gate asks for once the slot is credential-named.

  Self-evident placeholders are now skipped: bracketed template slots (`<…>`,
  `{{…}}`, `${…}`, `[…]`), placeholder words standing as their own token
  (`changeme`, `YOUR_API_KEY`, `example`), and one character repeated
  (`xxxxxxxxxxxx`). Whole-token matching only, so a real secret that merely
  contains such a substring is unaffected.

  The allowlist applies to non-structural findings only — a JWT, an `sk_live_`
  key, or a `postgres://user:pass@host` string still reports whatever words it
  contains. Set the new `allowPlaceholders: false` option to restore the previous
  behaviour.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 4.4.3

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 4.4.2

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 4.4.1

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 4.4.0

### Minor Changes

- [#190](https://github.com/ofri-peretz/eslint/pull/190) [`6bb476d`](https://github.com/ofri-peretz/eslint/commit/6bb476d232f85da8201b08d0a199c9267c3499e5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat(node-security): add `no-dynamic-algorithm-selection` (CWE-327)

  Disallow dynamic (non-literal) algorithm names in Node.js crypto functions.
  A runtime-selected algorithm argument can allow a downgrade to a broken or
  risky cryptographic algorithm (CWE-327: Use of a Broken or Risky
  Cryptographic Algorithm). AST-structural — flags non-literal algorithm
  arguments to the crypto APIs.

### Patch Changes

- [#215](https://github.com/ofri-peretz/eslint/pull/215) [`f42ea93`](https://github.com/ofri-peretz/eslint/commit/f42ea935555a558627dd61d1b013cd8509943c89) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Align `no-dynamic-algorithm-selection`'s `meta.docs.cvss` (7.4) to the CVSS its
  finding actually emits. The rule's message carries `CWE-327` and sets no
  per-message `cvss`, so it inherits `CWE_MAPPING['CWE-327']` = 7.5 via
  `enrichFromCWE` — docs now match the emitted value. Surfaced by the
  cross-plugin `security-cvss-docs-consistency.lock.test.ts` lock (added in [#213](https://github.com/ofri-peretz/eslint/issues/213)),
  which turned main red when this rule landed concurrently with the CVSS sweep.
  Documentation-metadata only; no emitted finding changes.

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

## 4.3.0

### Minor Changes

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat(node-security): add `no-math-random-crypto` (CWE-338)

  Detects `Math.random()` used in cryptographic contexts (tokens, keys, secrets,
  salts, IVs, session IDs) and steers to `crypto.randomBytes()` / `crypto.randomUUID()`.

  This was the one cryptography rule that the deprecated `eslint-plugin-crypto`
  shipped but had **not** been carried into `node-security` during the 2026-05
  consolidation — so `eslint-plugin-crypto`'s deprecation notice ("node-security
  includes all cryptography rules") was previously inaccurate. It is now true.

  Added to the `recommended` preset as `error`. The detection is return/assignment
  context-aware (matches `crypto`-named variables, properties, and function
  returns) so benign uses like a Fisher-Yates shuffle into a non-crypto variable
  do not false-positive — verified against the fn-fp benchmark (40/40 detection,
  0 false positives with the crypto-free fleet).

### Patch Changes

- [#144](https://github.com/ofri-peretz/eslint/pull/144) [`8843ce7`](https://github.com/ofri-peretz/eslint/commit/8843ce7fbb465caad161b97032467b3a37a49319) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: ILB-Wild FP reduction + doc examples + doc-test-alignment scanner fixes

  **`no-unlimited-resource-allocation` — FP reduction (430 Edge FPs)**
  - Skip loop-allocation reporting when the first argument is a numeric literal (e.g. `Buffer.alloc(1024)` inside a loop is statically bounded, not a risk)
  - Skip `Array.isArray`, `Array.from`, `Array.of` calls in the `alloc/Array` pattern check (these don't allocate unbounded memory)

  **`no-hardcoded-credentials` — FP reduction (~280 Edge FPs)**
  - Extended test-file skip to cover `.fixture.`, `.mock.`, `__mocks__/`, `/tests/`, `/fixtures/`, `/mocks/` paths
  - Skip string literals that are fallback values in `process.env.X || 'fallback'` expressions — the secret lives in the environment, the string is only a dev-mode default

  **Doc examples — 4 rules now have ❌ Incorrect examples**
  - `lambda-security/no-missing-authorization-check`
  - `lambda-security/no-overly-permissive-iam-policy`
  - `node-security/prefer-native-crypto` (renamed non-standard `### ❌ Third-Party (Flagged)` to `### ❌ Incorrect`)
  - `vercel-ai-security/require-tool-confirmation` (replaced placeholder with a real tested example)

  **`ilb-doc-test-alignment` scanner fixes**
  - Accept both `## ❌` and `### ❌` headings (docs use H3 under an H2 `## Examples` section; was only finding H2)
  - Slice from end-of-line rather than end-of-regex-match (prevents `## ❌ Incorrect Code` from leaving a partial heading in the parsed section)

  Result: `ilb:doc-test-alignment` → 206 ok, 0 doc has no ❌ examples (was 165 missing).

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- [#186](https://github.com/ofri-peretz/eslint/pull/186) [`edf208d`](https://github.com/ofri-peretz/eslint/commit/edf208d67ac2357312c97d8964fcf6a462e407eb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Consolidation cleanup — no rule behavior change:
  - **react-features**: the README rules table now lists the 8 `componentApi`
    preset rules. The README generator (`sync-readme-rules.ts`) and the
    `plugin-rule-source-drift` validator now recurse into nested
    `docs/rules/<category>/` subfolders, so every documented rule is advertised
    consistently (previously the nested componentApi docs were silently dropped,
    which an earlier `readme` exception had papered over — that exception is now
    removed in favour of the real fix).
  - **node-security**: remove the orphaned `no-pii-in-logs` rule source — the rule
    was migrated to `eslint-plugin-secure-coding` and is no longer exported here;
    the dead source was still compiling into `dist`.
  - **import-next**: restore the `no-cycle` unit test after [#180](https://github.com/ofri-peretz/eslint/issues/180)'s SCC refactor
    (`computeSCCsFromFile` + `findShortestCyclePath` are now bridged in the mock).

  Also fixes `scripts/ilb-plugin-scope-audit.ts` to stop mis-reading config-preset
  keys (`'recommended-strict': {`) as rules.

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat+fix: ILB-Wild FP reduction + two new quality rules

  **`no-unsafe-deserialization` FP reduction (~112 FPs)**
  - Track `fs.readFileSync('literal')` calls in `literalPathFileVars` — a file read with a
    hardcoded path (bundled config) is not user-controlled input for safe deserializers
    (`JSON.parse`, schema-validating parsers). `eval()` still fires even on literal-path reads.

  **`no-buffer-overread` FP reduction (~129 FPs)**
  - Remove `b` (single-char, too broad) and `chunk` (too common for array chunks) from the
    Buffer alias heuristic — `isBufferType` now only matches `buf` and `bytes` by name,
    reducing false matches on non-Buffer variables.

  **New rule: `modernization/prefer-template-literal`**
  - Flags `"string " + variable` concatenation and suggests the equivalent template literal.
  - Auto-fix produces the correct `` `string ${variable}` `` replacement.
  - Pure string literal chains (`"a" + "b"`) and numeric addition are not flagged.
  - Closes P2 quality FN `prob_string_concat` in the ILB-Arena-Quality bench.

  **New rule: `modularity/no-mutable-exports`**
  - Flags `export let` and `export var` — module exports should be immutable `const`
    bindings so all importers share a stable reference.
  - Auto-fix replaces `let`/`var` with `const`.
  - Closes P2 quality FN `prob_mutable_export` in the ILB-Arena-Quality bench.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## [4.1.0] - 2026-05-03

### Added

- New rule `no-deprecated-buffer` — flags use of the deprecated `Buffer()` constructor (Node.js security advisory; `Buffer.from`/`Buffer.alloc` should be used instead). Enabled in the `recommended` preset at `warn` to avoid breaking adopters with legacy `Buffer()` calls; will be promoted to `error` in the next major.

### Bug Fixes

- `no-zip-slip`: removed redundant dangerous-destination check from the literal handler. Extraction-call handler already reports `dangerousArchiveDestination`; the literal-side check was producing duplicate errors and (separately) firing on unrelated calls like `fs.readFileSync('/etc/app/config')`.
- `lock-file`, `detect-child-process`: minor refinements (see source diff).

## [4.0.4] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))
- **rules:** reduce false positives across security rules ([c192233c](https://github.com/ofri-peretz/eslint/commit/c192233c))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [4.0.3] - 2026-02-06

### Bug Fixes

- ⚠️ **rules:** reduce false positives across security rules ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))
- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ⚠️ Breaking Changes

- **rules:** Some previously flagged patterns are now correctly allowed ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))

### ❤️ Thank You

- Ofri Peretz

## [4.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-node-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [4.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## [4.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 31 Node.js security rules
- LLM-optimized error messages with CWE references and OWASP mapping
- 100% test coverage across all rules
- ESLint 8 and ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rule Categories

#### Cryptography Rules (12)

- `no-sha1-hash` - Disallow SHA-1 for security-sensitive operations (CWE-328)
- `no-weak-hash-algorithm` - Disallow MD5, SHA-1 for cryptographic hashing (CWE-328)
- `no-ecb-mode` - Disallow ECB mode for block ciphers (CWE-327)
- `no-static-iv` - Disallow static initialization vectors (CWE-329)
- `no-insecure-key-derivation` - Require secure key derivation functions (CWE-916)
- `no-insecure-rsa-padding` - Require OAEP padding for RSA (CWE-780)
- `no-self-signed-certs` - Detect disabled TLS certificate validation (CWE-295)
- `no-timing-unsafe-compare` - Require timing-safe comparison for secrets (CWE-208)
- `no-cryptojs` - Prefer native crypto over CryptoJS (CWE-327)
- `no-cryptojs-weak-random` - Disallow CryptoJS weak random (CWE-338)
- `no-deprecated-cipher-method` - Disallow deprecated crypto methods (CWE-327)
- `prefer-native-crypto` - Prefer Node.js native crypto module

#### File System Rules (7)

- `no-path-traversal` - Prevent path traversal attacks (CWE-22)
- `no-unsafe-file-permissions` - Enforce secure file permissions (CWE-732)
- `no-symlink-attacks` - Prevent symlink-based attacks (CWE-59)
- `require-file-validation` - Require file type validation (CWE-434)
- `no-temp-file-exposure` - Prevent temp file security issues (CWE-377)
- `no-hardcoded-paths` - Prevent hardcoded sensitive paths (CWE-426)
- `require-safe-path-join` - Require path.join for path construction (CWE-22)

#### Process & Shell Rules (6)

- `no-child-process-injection` - Prevent command injection (CWE-78)
- `no-shell-exec` - Disallow shell: true in spawn options (CWE-78)
- `no-env-exposure` - Prevent environment variable exposure (CWE-214)
- `require-process-sanitization` - Require input sanitization for process args (CWE-88)
- `no-unsafe-exec` - Disallow exec with dynamic input (CWE-78)
- `no-eval-alternatives` - Disallow Function constructor, vm runInContext (CWE-95)

#### Network Rules (6)

- `require-tls-verification` - Require TLS certificate validation (CWE-295)
- `no-dns-rebinding` - Prevent DNS rebinding attacks (CWE-350)
- `no-ssrf` - Prevent Server-Side Request Forgery (CWE-918)
- `require-https` - Require HTTPS for external requests (CWE-319)
- `no-unsafe-redirect` - Prevent open redirects (CWE-601)
- `require-host-validation` - Require host header validation (CWE-20)

### Presets

- `recommended` - Balanced security for Node.js applications
- `strict` - All rules as errors
- `crypto` - Cryptography-focused subset
- `filesystem` - File system security subset
- `network` - Network security subset

### Features

- Comprehensive detection patterns for Node.js core modules
- Support for popular libraries (fs-extra, glob, rimraf)
- Auto-fix capabilities where safe
- ESLint MCP integration for AI assistants
