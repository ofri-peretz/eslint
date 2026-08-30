# eslint-plugin-node-security

All notable changes to `eslint-plugin-node-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 5.2.3

### Patch Changes

- **🐛 Fix** — `no-timing-unsafe-compare` reported AST discriminant comparisons.

  ```js
  statement.expression.operatorToken.kind === SyntaxKind.EqualsToken;
  ```

  flint-fyi/flint, `packages/ts/src/rules/errorSubclassProperties.ts:56` — a
  TypeScript AST comparison inside their own lint rule, reported because the
  identifier carries `token`.

  `kind`, `type`, `flag`, `category` and their plurals join the non-secret tails.
  A discriminant an enum assigns is never a value an attacker guesses a byte at a
  time, and only the last word of the identifier is tested, so `tokenKind` is
  excluded while `kindToken` still reports.

- **🐛 Fix** — five false positives found by scanning real repositories.

  `no-improper-sanitization` reported every string literal nested inside an
  array in a response payload. The safety walk already climbed through arrays,
  but the check that decides whether the composed text is developer-authored
  did not handle `ArrayExpression`, so the literal fell through to a test that
  asks only whether it contains a dangerous _character_ — and `'` is one.
  `Response.json([{ children: [{ text: "You don't have permission…" }] }])`
  was a CWE-116 finding on the apostrophe.

  Its message was also wrong: `unsafeReplaceSanitization` is reported from
  exactly one place, a string carrying unescaped markup into a sink, and never
  from a `replace()` call. It now says what it detected.

  `no-weak-hash-algorithm` reported any call to a function named `sha1`, `md5`,
  or `md4`, including one defined in the same file. A helper named `sha1` that
  computes `createHmac("sha1", secret)` was reported as a CRITICAL CWE-327, and
  its suggestion rewrote the call to `sha256(...)` — renaming a local function
  out of existence while changing no algorithm. HMAC-SHA1 does not inherit
  SHA-1's collision weakness. Calls to locally-defined helpers are now skipped;
  whatever the body really uses is still reported where it is written.

  `no-hardcoded-credentials` reported OAuth route paths as CRITICAL CVSS 9.8
  hard-coded credentials tagged SOC2/PCI-DSS/HIPAA/GDPR. Two checks have to
  agree before it fires and both said yes for the wrong reason: the property
  name ends in `token`, and slashes plus digits clear the two-character-class
  shape test. `isSecretShaped` now rejects a URL or an absolute path — an
  endpoint is the address of a secret, not the secret. Connection strings are
  unaffected: `protocol://user:pass@host` is matched structurally before shape
  is consulted, and the new guard refuses any URL carrying userinfo.

  `no-math-random-crypto` reported `generateRequestId` — the log-correlation id
  factory in arangodb/arangojs, and the single finding in that whole repository.
  `/generate.*id/i` is the loosest entry in its function-name list and matches
  the most common identifier factory in Node. An id qualified by a correlation
  word (`request`, `trace`, `span`, `message`, `element`…) is now subtracted, in
  the shape the rule already uses for `code` and `key`. `generateSessionId` and
  `generateId` still report.

  Review found two residual gaps in the first pass of these fixes, both closed
  here. Skipping every locally-defined helper in `no-weak-hash-algorithm` opened
  a false negative — a local `sha1()` that really calls `createHash("sha1")`,
  feeding a session token, went silent in the default mode. The skip is now gated
  on `createHmac` evidence rather than on the binding being local. And
  `no-improper-sanitization` still reported when a JSON primitive sat beside the
  string, because `isSafeText` accepted only strings: `res.json([{ id: 1, text:
"You don't have permission" }])` was still a finding. Numbers, booleans, `null`
  and array holes cannot carry markup and are accepted; a regex literal is not,
  because its source can.

  A second review pass found both narrowing guards still too wide. The
  correlation-id subtraction in `no-math-random-crypto` suppressed
  `generateRequestTokenId`, which carries `token` and matches
  `/generate.*token/i` on its own; a crypto word anywhere in the name now
  outranks the correlation word. And `no-hardcoded-credentials` treated any
  single-slash-prefixed value as a route, so a secret starting with `/` — `/` is
  in the base64 alphabet — was suppressed before the shape checks ran. A route is
  made of route-shaped segments, and a lone segment mixing case and digits is a
  key rather than a path.

  `skipTestFiles` required a hyphen before `tests`/`specs` in a directory name,
  so `integration_tests/` did not count. That is the HMPPS house layout across
  the UK Ministry of Justice estate, and it made `detect-object-injection` report
  thirteen times inside `integration_tests/builders/` and
  `integration_tests/pages/` — test builders and page objects linted as
  production code. Underscore is now an accepted separator; `latest` and
  `manifest` still are not directories of tests, since neither has a separator
  before its final `est`.

- **🐛 Fix** — `no-improper-sanitization` reported through a `satisfies` wrapper.

  The `ArrayExpression` fix in the previous release shipped with a unit test using
  a bare array, which passed — while the file that produced the finding still
  reported twice, because its payload carries `satisfies Block[]`. The climb that
  decides whether a literal is developer-authored stopped at the TypeScript
  wrapper, so the literal fell back to a check that asks only whether it contains
  a dangerous character, and an apostrophe in `"You don't have permission to
write to this resource"` reported again.

  `satisfies`, `as`, `!` and angle-bracket assertions are now transparent in both
  the climb and the safety test. Markup underneath a wrapper still reports.

  `no-unsafe-deserialization` treated `x.eval(…)` on any receiver as a JavaScript
  code-execution sink. `client.eval(luaScript, 1, key, …)` is Redis EVAL — Lua,
  on the server, compiling nothing here — and it was the only finding in all of
  animir/node-rate-limiter-flexible. The Identifier branch already restricted
  `eval` and `Function` to globals; the member branch now does too. A member
  `deserialize` is still dangerous on any receiver.

  `no-toctou-vulnerability` reported `if (!existsSync(dir)) mkdirSync(dir, {
recursive: true })`. `recursive` means the call does not throw when the
  directory already exists, so losing the race is not an error, and `mkdir`
  writes no content — a substituted symlink makes it a no-op rather than a
  mutation landing on the attacker's name. Seven findings on
  nightscout/cgm-remote-monitor, all of this shape, where the remedy the message
  asks for is the code already written. Non-recursive `mkdirSync(dir)` throws
  EEXIST, so its guard is load-bearing and it still reports.

  `no-unencrypted-transmission` honoured `allowInTests` for template literals but
  not for plain string ones, so `"redis://localhost:6379"` in a spec file was
  reachable by neither that option nor the loopback exemption — which is
  scheme-gated on purpose, because a `mongodb://` string carries credentials that
  survive a host swap. Twenty-one findings on moleculerjs/moleculer. Loopback in
  a test file is now exempt on any scheme when the consumer opts in; a real host
  in a test file, and loopback in production code, both still report.

  `no-unsafe-buffer-alloc` cleared a covering write only when the allocation
  landed in a `const` declarator. Protocol code allocates inside a branch and
  assigns to a binding declared above it — `geoBuff = Buffer.allocUnsafe(9 + size)`
  — which the analysis never inspected: 38 findings on
  mariadb-connector-nodejs, every one a fully-written buffer. The assignment form
  is now resolved too, counting only references after the allocation so a write
  belonging to the previous value cannot clear this one. A loop writing
  `buf[i] = …` at a moving index is also recognised as covering, which is the
  same walk `writeUInt8(v, pos)` performs.

  `no-disabled-certificate-validation` takes `skipTestFiles`: an integration test
  against a local server with a self-signed certificate has no other way to
  connect, and all 21 findings on mariadb-connector-nodejs were under `test/`.
  Its sibling `no-self-signed-certs` deliberately does NOT — it already owns the
  decision through `allowInTests`, and `skipTestFiles` runs before `create()`,
  which would make that option dead.

  `no-xpath-injection` matched `[@` as an unambiguous XPath marker. Objective-C
  dictionary subscript is spelled the same way, and a code generator emits it as
  a string: `bodySnippet += indent + 'if (param[@"fileName"]) {\n'` drew four
  CWE-643 findings on postmanlabs/postman-code-generators, in a repository with
  no XPath library and no XPath API call. An attribute predicate names the
  attribute right after the `@`, so the marker now requires a name or `*`.

  `no-hardcoded-credentials` reported `__PYTHON#%0True__`. A dunder-delimited
  value is a slot a generator substitutes later — the same argument the rule
  already makes for `{{API_KEY}}` and `${SECRET}` — and the same repository
  declares `trueToken`, `falseToken` and `nullToken` that way in three files.

  `no-fail-open-auth` reported an empty catch that leaves the caller denied.
  `let token = null; try { token = verifyJWT(…).accessToken } catch (err) {}`
  followed by `if (token) { …grant…; return }` and a deny path below it is closed:
  the variable is still falsy, and the gate that reads it returns without
  granting. Verified on nightscout/cgm-remote-monitor. The corpus case that must
  stay reported has the same opening and then runs the privileged work with
  nothing branching on the variable — the difference is a guard that reads it and
  leaves, which is now what the rule looks for.

  `no-unsafe-buffer-alloc` read only the `const buf = Buffer.allocUnsafe(n)`
  spelling when deciding whether a buffer is covered before it is read. The
  assignment form — `buf = Buffer.allocUnsafe(n)` onto a binding declared above —
  resolved to nothing, so a fill that covers the whole buffer was invisible and
  the allocation reported anyway. A write at a computed index inside a loop now
  counts as covering, on the same evidence the rule already accepts for
  `writeInt32LE(value, position)`.

  `no-disabled-certificate-validation` had no test-file handling at all, unlike
  its sibling `no-self-signed-certs`, which owns the decision through
  `allowInTests`. It now skips test files.

  `no-graphql-injection` counted every `${…}` in a GraphQL template as unsafe
  interpolation, including the composition idiom every client teaches:
  `${MENU_FRAGMENT}` under a selection set, `${CART_QUERY_FRAGMENT}` at the end
  of a mutation. Fifty-three findings on Shopify/hydrogen, more than any other
  rule on any target scanned. An interpolated identifier is exempt when it
  resolves to a single never-rewritten `const` whose initialiser is itself a
  GraphQL template — `as const` included. A parameter, an import, a reassigned
  binding and an uninitialised one all still report, because none of them
  resolves to anything knowable. Measured on hydrogen: 53 findings to 30.

  `no-xxe-injection` treated `@xmldom/xmldom`, `fast-xml-parser` and `xml2js` as
  parsers that can reach an external entity. A probe says otherwise — the same
  document with a `SYSTEM` entity pointed at a local file returns `&xxe;`
  unresolved, `External entities are not supported`, and a parse error
  respectively. `xpath` was on the list too, and it parses nothing at all. Those
  four no longer raise the untrusted-input finding on their own; a deliberately
  enabled entity-expansion option still reports on any of them, and
  `libxmljs`, `libxmljs2`, `node-expat` and `xml2json` are unchanged. Thirty-one
  findings on nasa/earthdata-search, nine on refactoringhq/tolaria, five on
  aws/aws-toolkit-vscode.

  `no-math-random-crypto` reported the fallback arm of a function that reaches
  for a CSPRNG first:

  ```js
  if (window.crypto && window.crypto.getRandomValues) { … return … }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  ```

  That is IGNF/cartes.gouv.fr-entree-carto — the French national geoportal, and
  one of our own adopters. The author already knows; reporting the `else` arm of
  code that does the right thing whenever it can tells them nothing they have not
  written down. A `getRandomValues`, `randomBytes`, `randomUUID`, `randomFillSync`
  or `generateKey` call earlier in the same function now exempts the fallback. The
  trade is stated rather than hidden: a function that draws a key from `crypto`
  and a token from `Math.random()` goes unreported, because the two are
  indistinguishable without following the values.

  `no-zip-slip` treated a bare `.extract()` on any receiver as archive
  extraction. `this.extract("id")` on an entity collection and
  `propagator.extract(context.active(), headers, getter)` in OpenTelemetry both
  matched — 22 findings on passbolt/passbolt_styleguide, an open-source password
  manager, and 3 on nioc/node-red-contrib-opentelemetry. Neither file contains
  the substring `zip`, `tar` or `archive` anywhere.

  The file-level archive-context guard did not save them, because it was
  circular: `isArchiveExtraction()` established the context that
  `isArchiveExtraction()` then relied on, so the call being judged was its own
  evidence that the file handles archives. Context now comes only from a name
  that means an archive, and the four verbs that are ordinary English —
  `extract`, `extractAll`, `unzip`, `untar` — need a receiver that names one.
  `extractAllTo` and `extractArchive` belong to adm-zip, collide with nothing,
  and still match on sight. Both real shapes are pinned as valid cases.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.3`

## 5.2.2

### Patch Changes

- **🐛 Fix** — Two detections `eslint-plugin-security` has and we did not, plus a false positive in test files. ([#685](https://github.com/ofri-peretz/eslint/pull/685))

  `crypto.pseudoRandomBytes()` is now reported by `no-math-random-crypto`
  (CWE-338). Unconditional, unlike the `Math.random()` path in the same rule:
  Math.random has legitimate non-security uses — jitter, sampling, a DOM id — so
  that path gates on surrounding names, whereas `pseudoRandomBytes` has exactly
  one meaning and was deprecated in Node 4 for being mistaken for the secure one.

  The deprecated `noAssert` argument is now reported by `no-buffer-overread`
  (CWE-125). Distinct from that rule's existing CWE-126 work: the offset may be
  perfectly ordinary and the caller has switched off the check that would catch it
  being wrong. Covers `readX(offset, true)`, `readUIntBE(offset, len, true)` and
  the `writeX` forms.

  `no-shell-injection` now skips test files — on alphagov/govuk-mobile-backend it
  reported a test invoking its own build script through `execSync`.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.2`

## 5.2.1

### Patch Changes

- **🐛 Fix** — Scaffolding for tests is now recognised as test material, and `no-math-random-crypto` allows test files by default. ([#671](https://github.com/ofri-peretz/eslint/pull/671))

  `testUtils/`, `test-utils/`, `testing/`, `test-helpers/` and their siblings hold
  the builders and fake objects a suite consumes. They appear in six of the eight
  public repositories in the current sample, and none of them was recognised. The
  pattern is spelled out rather than matched as a prefix, because `test` also
  starts `testimonials`.

  `no-math-random-crypto` defaulted to reporting in test files. A fake OIDC user
  whose `session_state` is filled with `Math.random()` is what a test double looks
  like, and the suggested fix — use `crypto.getRandomValues` — makes a fixture no
  safer. The rule's subject is unpredictability at runtime and a fixture has no
  runtime. Set `allowInTests: false` to restore the old behaviour.

  Together these take City-of-Helsinki/haitaton-ui from 4 findings to 0 across
  61.7 KLOC.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.1`

## 5.2.0

### Minor Changes

- [#659](https://github.com/ofri-peretz/eslint/pull/659) [`f3f9152`](https://github.com/ofri-peretz/eslint/commit/f3f915220bf2bc1f74b599601f80297b8a432918) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-weak-hash-algorithm` sees twelve more spellings of "this is a credential".

  An adversarial wave hashed seventeen common credential identifiers with MD5 and
  found **twelve silent**. Every one is CWE-327:

  ```
  passphrase  passPhrase  otp  mfaCode  pinCode
  masterKey  securityAnswer  seedPhrase  mnemonic
  ```

  `no-math-random-crypto` had the same gaps — the two rules keep separate lists,
  so a spelling missing from one is not missing from the other by construction.
  `passphrase` and `mnemonic` are added there too.

  `seedPhrase` and `mnemonic` are the worst of them — an MD5 digest of a wallet
  recovery phrase is about as bad as this rule gets.

  The additions are chosen against `makeNameTest`'s mechanics rather than by
  feel. An entry under six characters matches **whole words only**, so `pwd`
  reads `pwd` and `userPwd` and cannot collide inside a longer word. Entries of
  six or more also match as a substring of the joined identifier, which is why
  the compounds are listed whole — `pincode`, not `pin`.

  **`pwd`, `pass` and `pin` are deliberately absent.** `pwd` was added first — the
  commonest short spelling of "password", and the highest-value entry on paper.
  A wider FP control then caught `pwdDirectory`, `pwdPath` and `currentPwd` all
  reporting CWE-327 over ordinary filesystem code: in Node, `pwd` is also the
  working directory. `password` has no second meaning; `pwd` does, in exactly the
  ecosystem this plugin targets. Those three are now `valid` fixtures. Both are ordinary words in code
  that has nothing to do with credentials — a test `pass`, a `pin` on a map — and
  both are short enough to match whole words. The compound forms that _do_ mean a
  credential are covered by their full spelling, the same trade the list already
  makes for `cert` versus `certificate`.

  Measured on the pinned 8-repository corpus: **925 findings before, 925 after**.
  Pure recall, no cost on real code. The FP control in the new test is the half
  that proves it — `passenger`, `bypassRoute`, `pinnedTabs`, `mapPin`,
  `passingTests` and `seedData` all stay silent.

## 5.1.3

### Patch Changes

- [#650](https://github.com/ofri-peretz/eslint/pull/650) [`cf0dcbb`](https://github.com/ofri-peretz/eslint/commit/cf0dcbb17eab864157a76a5c113688fa050853a6) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Release notes now list every pull request in the release.

  The changeset text says what changed in our words, which is the right thing to
  lead with. It does not answer the question a consumer actually arrives with —
  _which_ PRs are in the version I just installed — and that is the question asked
  by someone whose reported false positive stopped appearing, or by someone
  deciding whether an upgrade is worth it.

  `scripts/prs-since-release.ts` reads the package's own tags, walks the commits
  that touched that package since its previous release, and lists the squash-merge
  PRs. Per-package, because the repo's tags interleave every package and the
  question is always about one of them. Sorted by `-v:refname` so 5.1.10 ranks above
  5.1.9 rather than lexically below it, which would silently truncate the range to a
  single release.

  It reads git rather than the GitHub API: the tags and subjects are already in the
  checkout, and an API call would need a token and a rate-limit budget inside a
  matrix job that runs once per package.

- [#654](https://github.com/ofri-peretz/eslint/pull/654) [`681d998`](https://github.com/ofri-peretz/eslint/commit/681d998118e8248337ab3f55a0e6da1f21fc13dd) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - A visible origin beats a wire-shaped name.

  `no-unsafe-buffer-alloc` reported a PNG writer three times — `new Uint8Array(4 +
data.length)` and `new Uint8Array(bytes.length + chunk.length)` — as CWE-789, "the
  allocation size is read off the wire, so the peer picks it". The file never touches
  a socket. Found on IGNF/cartes.gouv.fr-entree-carto, a French government mapping
  site that runs this plugin.

  Two changes, both applying reasoning the rule already had:

  `data` leaves `WIRE_NAMES`, for the reason `bytes` did. Every name on that list
  must denote a BUFFER; `data` is the most generic parameter name in JavaScript and
  denotes one only sometimes. Renaming the parameter silenced the finding, which is
  the definition of a name-inference false positive.

  And where an identifier resolves to a **local variable**, the rule now follows the
  initializer instead of trusting the spelling. A name is evidence only where the
  origin is invisible — a parameter, or a binding this file never declares. This is
  the same move the `Buffer` case already made, generalised: `const chunk =
buildPngChunk('pHYs', phys)` is answered by looking at what `chunk` is, not at what
  it is called.

  Recursing rather than bailing keeps the true case: `const chunk = req.body.raw`
  still reads wire, now for a reason rather than a spelling. Both CWE-770 corpus
  fixtures still detect, and a `chunk` parameter or an undeclared `chunk` still
  reports.

## 5.1.2

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

- [#635](https://github.com/ofri-peretz/eslint/pull/635) [`0d30b1c`](https://github.com/ofri-peretz/eslint/commit/0d30b1c1b900c4664b7f67aebb87c6e5ee9f6bf4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Four false positives found by scanning nineteen open-source repositories.

  Round two of the adoption loop, every finding read in source before it was
  judged. Each of these reported correct code as a vulnerability.

  - `node-security/detect-eval-with-expression` and
    `secure-coding/no-unsafe-deserialization` treated an imported `Function` as the
    `Function` constructor. `Function` from `aws-cdk-lib/aws-lambda` is an AWS
    Lambda construct that deploys a handler and compiles nothing, so
    `new Function(this, id, { runtime: Runtime.PYTHON_3_11 })` — how every CDK
    stack declares a lambda — was a code-execution finding. Thirty of them in one
    6 KLOC library. All three report paths now resolve the identifier through the
    scope analyser; an unresolved identifier still reports, because that is what
    being the global means.
  - `browser-security/no-credentials-in-query-params` reported the shape RFC 6749
    §2.3.1 prescribes: `body: \`client_id=${id}&client_secret=${s}&token=${t}\``,
OAuth 2.0 sending credentials the way the spec says to. A query string and a
form-encoded body are the same characters, so the exemption is positional — a
`body`/`data`/`form`property value, or a`URLSearchParams` argument. The same
    string in a URL still reports.
  - `secure-coding/no-improper-type-validation` reported the correct null-safe
    idiom `typeof x == 'object' && x !== null`, because its `typeof` arm accepted
    only `===`/`!==` and the loose spelling fell through to the type-juggling arm.
    Both operators now reach the `typeof` arm, which also gains recall: an
    unguarded `typeof x == 'object'` reports the right message instead of the
    wrong one. The rule also leaves the `owasp-top-10` preset, where its
    loose-equality arm — 126 findings across 78 KLOC — re-reported `eqeqeq` under
    a security banner, the same reason `no-insecure-comparison` left it. A new
    `checkLooseEquality: false` keeps the three structural arms without it.

  Adds `benchmarks/fp-gate/`, a corpus of code read by hand and confirmed benign,
  mostly lifted verbatim from real repositories with provenance recorded. A rule's
  own fixtures only contain code that already looks like its target domain, which
  is why none of these were caught: every `require-algorithm-whitelist` fixture
  names the receiver `jwt`. The gate ratchets, and aborts rather than report a
  partial count when a plugin fails to load.

- Updated dependencies [[`3854526`](https://github.com/ofri-peretz/eslint/commit/38545268c6028267787a1cb7c0a7e065babad99c), [`16bae7b`](https://github.com/ofri-peretz/eslint/commit/16bae7ba0451ed19757231be60b8ed88abb35d9e), [`5e0e029`](https://github.com/ofri-peretz/eslint/commit/5e0e029acc7ad5877c915d56bea5f4f707983fe6), [`d81469f`](https://github.com/ofri-peretz/eslint/commit/d81469fa2921043b44b1f042e23cb9148ae72c04), [`a22fd9b`](https://github.com/ofri-peretz/eslint/commit/a22fd9b7755f3988739f9d67a7c209b77836612a), [`6f9124e`](https://github.com/ofri-peretz/eslint/commit/6f9124e5e29a7cf7c5e0dde3127bcf219c1538d7)]:
  - @interlace/eslint-devkit@1.17.0

## 5.1.1

### Patch Changes

- [#589](https://github.com/ofri-peretz/eslint/pull/589) [`89f4b6d`](https://github.com/ofri-peretz/eslint/commit/89f4b6d5cfda758e49be299ceed1aa32c490e65c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-timing-unsafe-compare` no longer treats a route as a credential.

  `DEFAULT_NON_SECRET_TAILS` already carried `address` on the reasoning that a
  trailing word can mark a value as a location rather than a secret. The rest of
  that idea was missing, so this fired on Shopify/cli's OAuth callback server:

  ```js
  if (requestUrl.pathname !== STORE_AUTH_CALLBACK_PATH) {
    /* 404 */
  }
  ```

  `requestUrl` derives from `req.url`, so one operand is attacker-readable and the
  other is not — the taint shape the rule reports on. The name carries `auth`
  because it belongs to an auth _flow_; the value is a route, and timing a route
  match leaks nothing. CWE-208 at CVSS 5.9 on request routing.

  Added: `path`, `paths`, `pathname`, `pathnames`, `endpoint`, `endpoints`,
  `route`, `routes`, `hostname`, `host`, `port`, `origin`.

  `url` and `uri` are deliberately **not** tails — a presigned URL carries its
  signature in the query string and is itself the credential, so `signatureUrl`
  must keep reporting. Pinned as an FN guard, alongside `STORE_AUTH_CALLBACK_TOKEN`
  which proves the tail is what excludes rather than the `auth` word.

  Verified on the pinned corpus: this rule drops from 1 finding to 0, total
  42 → 41.

## 5.1.0

### Minor Changes

- [#581](https://github.com/ofri-peretz/eslint/pull/581) [`ab9c48a`](https://github.com/ofri-peretz/eslint/commit/ab9c48a651803d95faeb2257a77cbceec95badbf) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-child-process` no longer calls a shell-free spawn "command injection".

  `spawn`, `execFile` and `fork` default to `{ shell: false }`. When the executable
  name is attacker-steerable the defect is real, but it is process control, not
  shell-metacharacter injection — and the rule reported it as CWE-78 at CVSS 9.8
  with the advice _"use execFile/spawn with `{shell: false}`"_, which is what the
  reported line already did. Remediation that is a no-op on the line it is attached
  to is a finding nobody can act on.

  Measured against eslint-plugin-security's own `valid` corpus, this fired on 11 of
  their 19 valid cases for this class — the single largest source of our findings
  on code a competitor labelled clean.

  Those findings now report **`untrustedProgram`** — CWE-114, HIGH — whose fix is
  to resolve the name against an allowlist of permitted executables. Nothing
  becomes silent and nothing new is reported: the same calls report, saying what is
  actually true about them. `exec`/`execSync`, an explicit `shell: true`, a literal
  shell binary (`spawn('bash', ['-c', …])`) and eval flags (`-c`, `-e`, `/c`) all
  still report CWE-78, because a shell really is in the picture.

  If you match on `messageId`, add `untrustedProgram` alongside
  `childProcessCommandInjection`. The rule's own docs already described this split
  correctly — the code was the half that disagreed.

- [#583](https://github.com/ofri-peretz/eslint/pull/583) [`ccf90e6`](https://github.com/ofri-peretz/eslint/commit/ccf90e634c8a92e9cef201a4544576afe7aab176) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-non-literal-fs-filename` now sees through a computed key.

  `readFileSync(cfg[prop])` was silent while `readFileSync(dir)` reported — the
  weaker evidence produced the louder verdict. A computed key selects _which_
  value you get, so an unknowable key makes the result unknowable however
  well-known the object is; `containsFreeVariable` simply had no MemberExpression
  case and never visited the key.

  The object is deliberately not walked. ESLint resolves no Node globals by
  default, so `process` reads as a free variable and recursing into the object
  would report every `process.env.HOME` in existence. Static keys name one fixed
  slot and are left to the checks that already own them — `import.meta.url` stays
  quiet.

  Measured over the 20-repository real-source corpus — 21,394 files, 3.10M lines —
  this rule reports **0 findings**, unchanged by the new branch. Because the branch
  only ever adds a `true`, findings can only increase, so zero after means zero
  before: the recall came with no new noise.

  This closes the last uncovered case on eslint-plugin-security's own must-detect
  corpus, taking weighted parity to **51/51 (100%)** with `fires-on-valid`
  unchanged.

### Patch Changes

- [#584](https://github.com/ofri-peretz/eslint/pull/584) [`ef52590`](https://github.com/ofri-peretz/eslint/commit/ef52590a1eb212ee5a66cb69da579ac69a2c778d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-child-process` no longer reads `-c` as an eval flag for every binary.

  `usesShell` treated any of `-c`, `-e`, `/c` in argv as proof that the next entry
  is source text, whatever program was being run. But a flag only means what the
  program parsing it says it means. Found on the 20-repository real-source corpus,
  in n8n's `scripts/dev-up.mjs`:

  ```js
  execFileSync('gh', [
    'codespace',
    'ports',
    'visibility',
    `${port}:org`,
    '-c',
    name,
  ]);
  ```

  `-c` there is gh's own `--codespace`. Every argv entry is a literal or a template
  of literals, no shell is anywhere near it, and the rule reported CWE-78 command
  injection at CVSS 9.8. Deciding by a token rather than by the program that parses
  it is precisely what `lint:name-inference` exists to catch — committed by a
  security rule.

  Each binary now carries its OWN tokens, because a shared set is the same defect
  one level up:

  |                     | evaluates                       | does not                        |
  | ------------------- | ------------------------------- | ------------------------------- |
  | `php`               | `-r`                            | `-e` — that is `--profile-info` |
  | `deno`              | `eval` (a subcommand)           | `-e` — no such option           |
  | `node` / `bun`      | `-e`, `--eval`, `-p`, `--print` |                                 |
  | `python`            | `-c`                            | `-e`                            |
  | `perl`              | `-e`, `-E`                      |                                 |
  | `ruby`, `osascript` | `-e`                            |                                 |

  Shells are not in the table: a literal `sh`/`bash`/`cmd`/`powershell` command is
  already treated as a shell before flags are consulted.

  The gate only ever suppresses, and only when the command is a **literal** naming
  a binary we can place. `execFileSync(bin, ['-c', name])` keeps the conservative
  union, because an unnameable binary may well be a shell.

  Real-source findings **7 → 5** over 21,394 files. `php -r`, `deno eval`,
  `node -p` and `perl -E` now report where they previously did not.

## 5.0.0

### Major Changes

- [#574](https://github.com/ofri-peretz/eslint/pull/574) [`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Remove schema options that were never read

  About two dozen options were declared in `meta.schema`, documented, and read by
  nothing in `create()` — in any revision `git log -S` can reach. Because each
  rule sets `additionalProperties: false`, a consumer who configured one got no
  validation error either: the option validated cleanly and did nothing.

  **This is a breaking change for anyone who set one.** Removing them turns a
  silent no-op into a config error, which is the point — the alternative is
  leaving options that look like the escape hatch you reach for when a rule is
  noisy, and are not.

  Three worth naming, because they read exactly like that escape hatch:

  - `secure-coding/no-improper-sanitization` — `trustedLibraries`
  - `secure-coding/no-improper-type-validation` — `safeTypeCheckFunctions`
  - `secure-coding/no-electron-security-issues` — `allowInDev` (promised the rule
    would stand down in dev builds; it never did)

  Also removed: `prefer-native-crypto.severity` and `no-cryptojs.severity`
  (unimplementable — ESLint takes severity from the config entry),
  `detect-child-process.strategy`, `detect-non-literal-fs-filename.allowedExtensions`,
  `no-clickjacking.trustedSanitizers`, and
  `require-postmessage-origin-check.trustedOrigins`.

  Several were implemented rather than deleted, where the rule could honour them:
  `no-dynamic-require.allowPatterns`, `no-toctou-vulnerability.fsMethods` (whose
  advertised default was also wrong — three methods where the code had six), and
  `no-buffer-overread.trustedSanitizers` (which was being handed the buffer
  _access_ when the finding is about the _index_).

  If you have one of the removed options in your config, delete it. It was not
  affecting your results.

- [#574](https://github.com/ofri-peretz/eslint/pull/574) [`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rules now say only what they proved

  This release is a quality pass, not a feature release. Every change below was
  driven by measuring the rules against **20 real repositories, 21,394 files,
  3.10M lines** — not against our own fixtures, which is where the defects had
  been hiding.

  ## Half of `detect-object-injection`'s output could not be the weakness it named

  The rule reports CWE-1321, prototype pollution. **49% of its findings were
  reads**, and a read cannot pollute a prototype:

  ```js
  const o = {},
    k = '__proto__';
  const v = o[k]; // Object.prototype unchanged
  ```

  That is executed, not argued — there is no key, no object and no runtime where
  evaluating `obj[k]` as an expression writes anything. Reads are no longer
  reported, **except** where the value is invoked: `const h = handlers[k]; h()`
  is a read, and `{"action":"constructor"}` hands you the Object constructor.

  **14,910 findings → 5,751**, with recall proven intact — 100% F1 and 100%
  Youden's J against the rule's corpus, unchanged before and after.

  A read of an attacker-chosen key can still disclose something it should not.
  That is CWE-200, a different weakness, and reporting it under a CWE-1321 message
  told you the wrong thing.

  ## `detect-non-literal-regexp` stopped claiming a vulnerability it cannot decide

  Every one of its findings reported `issueName: 'ReDoS vulnerability'`. The rule
  establishes that a pattern is not a literal. Catastrophic backtracking is a
  property of an automaton and needs one to decide — `no-redos-vulnerable-regex`
  decides it with `recheck`, an independent oracle, at 98.1% precision.
  `new RegExp(escapeRegExp(name))` is not a literal and cannot backtrack;
  `/(x+x+)+y/` is a literal and does.

  **Breaking:** the messageId is now `runtimeDecidedPattern`. If you key on
  messageIds in a formatter, SARIF pipeline or CI check, update it. The message
  states what was established and names the two rules that decide what it cannot.

  Also removed: a table that matched `**`, `++` and `??` **as text in your source**
  and escalated findings to CRITICAL on that basis. It never changed the verdict,
  only the severity, on a textual guess at the one thing this rule proves nothing
  about.

  ## Recall: three spellings reached `RegExp` past both regex rules

  Found by attacking the rules deliberately rather than by waiting for a bug
  report. All three were silent in `detect-non-literal-regexp` **and**
  `no-redos-vulnerable-regex`:

  ```js
  const { RegExp: R } = globalThis;
  new R(p); // destructured intrinsic
  class My extends RegExp {}
  new My(p); // subclassed
  Reflect.construct(RegExp, [p]); // constructed reflectively
  ```

  **Cost: zero.** Both rules report exactly what they reported before across all
  3.10M lines. Coverage against evasion, bought at no additional noise.

  The same pass narrowed a clone exemption that was too generous:
  `new RegExp(re.source, re.flags)` is exempt only when the file can see that
  `re` is a regex. Any object can carry `.source` and `.flags`, and
  `JSON.parse(body)` is one.

  It also stopped reporting a pattern read from a frozen table — the shape this
  rule's own documentation recommends as the safe alternative:

  ```js
  const PATTERNS = { email: '^[a-z]+@[a-z]+$' } as const;
  new RegExp(PATTERNS.email);       // no longer a finding
  ```

  `const` prevents rebinding and not mutation, so the table is only trusted when
  nothing in the file writes through it. `PATTERNS.email = req.body.p` anywhere,
  even in another function, puts it back in play. Computed lookups —
  `PATTERNS[key]` — still report, because the key is chosen at runtime.

  ## `detect-non-literal-fs-filename` no longer calls a constant a traversal

  `fs.readFileSync('/etc/shadow')` reported under CWE-22 path traversal, advising
  `path.basename()`. Nothing is traversed and nothing is attacker-steered; you
  cannot basename a constant into safety. A hardcoded path is now a finding only
  if it actually contains a `..` segment.

  "A program reads a sensitive location" is a real concern, and a different one —
  it needs its own message and CWE rather than borrowing this rule's.

  ## `allowInTests` no longer depends on where your repo is checked out

  Ninety-eight rules each carried their own copy of
  `/\.(test|spec)\.(ts|tsx|js|jsx)$/`. They now share one predicate, so the answer
  cannot drift between rules or change with the path a file happens to sit at.

  `no-privilege-escalation` and `no-missing-authentication` gain a
  `testFilePattern` option for projects whose test layout differs. Unset — the
  default — the shared predicate decides.

  ## How the claims above are checked

  Precision and recall numbers come from head-to-head runs against the
  corresponding upstream rules on a shared corpus, and every behaviour change is
  measured on the 20 repositories before and after. Where a claim could not be
  settled by analysis it was settled by execution: the prototype-pollution probe
  runs on Node 24, and the regex-clone claim is confirmed by `recheck` returning
  the same verdict for a pattern and its copy.

  Two things are recorded rather than fixed, because we would rather name a limit
  than paper over it: recognising an escaped interpolation
  (`new RegExp(escapeRegExp(x))`) requires knowing what a function returns, which
  is interprocedural analysis these rules do not do; and
  `detect-non-literal-fs-filename` has an unresolved question about whether a
  hardcoded path to a sensitive location is a finding at all.

### Minor Changes

- [#574](https://github.com/ofri-peretz/eslint/pull/574) [`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rules decide by evidence, and every vocabulary is now an option

  A large sweep replacing name-substring inference with resolved evidence, and
  exposing the word lists that remained as configurable options with explicit
  defaults.

  **Expect new findings on code that was previously silent.** These are rules
  shipping at `error` in `recommended`, so this will surface in consumer repos.
  The findings are not new bugs in your code; they are shapes the rules could not
  previously see.

  ## What will newly report

  The largest single source is `secure-coding/no-sql-injection`, where a function
  parameter is now treated as a caller-supplied inlet by default
  (`treatParametersAsUntrusted`, default `true`). Before, a taint root had to be
  visible in the same file, so the commonest real shape in a codebase —

  ```js
  export function search(term) {
    return db.query(`SELECT * FROM items WHERE name LIKE '%${term}%'`);
  }
  ```

  — was silent. Set `treatParametersAsUntrusted: false` to restore the old
  behaviour.

  Also newly detected across the ecosystem: SQL assembled by a local helper and
  then executed (arguments are now bound across the call boundary); `+=` append
  builders and `Array#join`; the driver query-config object
  (`db.query({ text, values })`); big-endian `Buffer.read*BE` readers, which is
  what a network protocol parser actually uses; `req.headers['x'] || ''`, which
  previously terminated the taint walk; uppercase URL schemes (`HTTP://`,
  `WS://`), which evaded three rules and one autofix; and `window.fetch` /
  `self.fetch` / `globalThis.fetch`, the last of which is the only spelling
  available inside a Worker.

  ## What will stop reporting

  False positives that decided from a spelling. Among the measured ones:
  `if (passengers.length >= 4)` reported as a weak password requirement;
  `localStorage.getItem("recipe-casserole-draft")` as client-side auth logic
  (`role` ⊂ `casserole`); `carpoolClient.query('BEGIN')` — a ride-sharing API — as
  a transaction on a pg Pool; `poolClient.query('BEGIN')`, which is the
  _remediation_; `const PARAM = "static"` as an unescaped URL parameter; and
  `<link rel="canonical">` as mixed content, which every SSR app has.

  `postgresql-security/prevent-double-release` no longer infers release state from
  a flag's spelling, so it stops flagging a correct guard named `settled` and
  starts catching a genuine double release guarded by a flag that is never
  assigned.

  ## New options

  Every vocabulary that decides a report is now an option with an explicit default
  matching the previous behaviour exactly, in both `defaultOptions` and
  `meta.schema`, with an `additional*` variant where extending rather than
  replacing is the common case. Sets that are a fixed API surface rather than a
  vocabulary — Node's `createCipheriv`, the Service Worker `Cache` write methods,
  CSP directive names, IANA media types, the ldapjs call signature — are
  deliberately **not** configurable: making them so would let a consumer silence a
  rule on precisely the shapes it exists to find.

### Patch Changes

- Updated dependencies [[`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d)]:
  - @interlace/eslint-devkit@1.16.1

## 4.13.1

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

## 4.13.0

### Minor Changes

- [#560](https://github.com/ofri-peretz/eslint/pull/560) [`1f5aa42`](https://github.com/ofri-peretz/eslint/commit/1f5aa42002a19dcb854a6342c79a6de0b99c9075) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - 100% drop-in parity with `eslint-plugin-security`, and twelve false-positive fixes.

  Parity against the incumbent's own RuleTester suite reaches 51/51 live cases.
  `detect-non-literal-fs-filename` now reports a path composed from an unresolvable name
  such as a template interpolation or a `path.resolve` argument, while `__dirname`-rooted
  constant paths stay silent.

  False positives removed, each found by hand-reading findings on 20 open-source projects and
  each locked with a test that fails on the unfixed rule:

  - `no-missing-authentication` no longer treats path-less `app.use(helmet())` as a route
    handler, and ships a default public-route allowlist so login, password-reset and health
    endpoints are not reported. It also no longer writes `console.log('DEBUG MSG:')` to stdout,
    which corrupted the JSON and SARIF formatters for anyone using `ignorePatterns`.
  - `detect-object-injection` no longer reports a computed read off a `const` object literal —
    the closed allowlist is the documented fix for this CWE.
  - `no-http-urls`, `no-insecure-websocket` and `no-unencrypted-transmission` exempt loopback
    and RFC 2606 reserved domains through one shared helper. `mongodb://user:pass@localhost`
    still reports.
  - `no-insecure-comparison` no longer treats a comparison against a boolean, `null` or
    `undefined` literal as a timing attack.
  - `no-format-string-injection` requires an actual format specifier and no longer double-reports.
    It also gains a fix: `console.log(userText, secret)` is now detected, because Node runs the
    first argument through `util.format` whenever more arguments follow.
  - `no-directive-injection` recognises a sanitizer call as the fix rather than the defect.
  - `require-csp-headers` recognises helmet; `no-missing-security-headers` no longer fires on a
    scope that only sets transport or caching headers.
  - `no-graphql-injection` requires a selection set to name a field.
  - `no-unsafe-regex-construction` no longer reports a RegExp clone.

  `browser-security/no-clickjacking` is deprecated and has been removed from `recommended`. It
  remains exported; enable it explicitly if you still want it.

  Every rule now ships a documentation page (121/121).

## 4.12.0

### Minor Changes

- [#555](https://github.com/ofri-peretz/eslint/pull/555) [`485f3ec`](https://github.com/ofri-peretz/eslint/commit/485f3ecdd86a1085eb893ee711322582ca58187f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix a command-injection false negative, repair every rule's documentation link, and close the
  detection gaps measured against eslint-plugin-security's own test suite.

  **Security fix (`node-security/detect-child-process`).** `containsDynamicStrings` matched on
  node types and let `MemberExpression`/`CallExpression` fall through to "not dynamic", so
  `exec(req.query.cmd)` was silently skipped whenever `allowLiteralStrings: true` was set — a
  false negative on the exact input shape the rule exists to catch. It now asks whether the
  argument is provably constant instead, which also stops `const CMD = 'ls'; exec(CMD)` from
  reporting.

  **Every rule documentation link returned 404.** Rules inherited a placeholder URL pointing at
  `packages/eslint-plugin/docs/rules/<name>.md`, a path that has never existed, so every "see
  docs" link in every IDE, CI annotation and SARIF file was broken. `withCanonicalDocsUrls()`
  now stamps the canonical `eslint.interlace.tools` URL at plugin-export time, locked per package.

  **New devkit primitives.** `isStaticExpression()` (scope-aware constant folding, with a
  `treatConstAsStatic: false` escape hatch) and `resolveModuleBinding()` (resolves a value back
  to its source module through `node:` prefixes, chained requires, renamed destructuring,
  sub-namespaces and configurable drop-ins like `fs-extra`).

  **New rules and coverage.**
  - `secure-coding/no-bidi-characters` — Trojan Source / CWE-1007, with a removal suggestion.
  - `secure-coding/detect-object-injection` now catches the prototype-polluting copy loop
    (`for (const k in source) target[k] = source[k]`) when the source is a function parameter,
    suppressing the generic report so it adds no duplicate findings.
  - `node-security/detect-non-literal-fs-filename` covers the ~19 path-taking `fs` methods the
    list omitted (`open`, `rename`, `copyFile`, `symlink`, …) and resolves bindings the
    namespace tracker missed. `realpath` and `exists`/`watch` are deliberately excluded —
    canonicalisation is the documented mitigation, not a sink.
  - `node-security/detect-child-process` handles `node:child_process`, chained
    `require('child_process').exec()`, and a bare `require('child_process')`.
  - `browser-security/no-innerhtml` adds the `srcdoc` sink.

  **Packaging.** All three plugins now export `./package.json`, which tooling needs for version
  detection.

  **Two verdicts that were sharing one branch.** `detect-non-literal-fs-filename` and
  `detect-child-process` treated "declared nowhere" and "resolved, but not provably constant"
  as the same unresolved answer. They are not the same:

  ```js
  fs.readFile(filename); // `filename` bound nowhere — now reports
  function read(p) {
    return fs.readFile(p);
  } // a parameter — stays quiet
  ```

  A free variable (`ref.resolved === null`, the scope analyser's own verdict) admits no local
  reasoning at all, so it reports. Anything that resolves keeps the behaviour introduced when
  these rules were inverted to report reachable taint — the rollup configs, glob enumerations
  and thin fs facades that made up 105 of 113 adjudicated findings stay silent.

  **A false negative in taint provenance.** `let c = 'ls'; c = req.query.c; exec(c)` answered
  `'ls'`, because only the declarator's initialiser was read. Provenance is now the last write
  before the use — not _any_ write, which inverts the error: `var mod = req.body.a; var mod =
"fs"; require(mod)` loads `fs`, and reporting that is a false positive whose fix is already
  applied.

  **`process` is the operator, not a remote attacker.** `spawn(process.execPath, argv)` and
  `execFileSync(binTarget, ['--version'])` were reported as command injection while being the
  documented remediation for it. `process.argv`/`process.env` come from whoever launched the
  program, from a shell they already control — no lever for the two questions the no-shell path
  asks, both about reaching a binary you otherwise could not. `process` therefore no longer
  steers the no-shell path, and **still does steer the shell path**, where
  `execSync('rm -rf ' + process.argv[2])` splices a value into code. Both cases are pinned.

  Measured across 8 real repositories: 31 findings, unchanged from before these detection
  additions, with no rule over its budget.

### Patch Changes

- Updated dependencies [[`485f3ec`](https://github.com/ofri-peretz/eslint/commit/485f3ecdd86a1085eb893ee711322582ca58187f)]:
  - @interlace/eslint-devkit@1.15.0

## 4.11.0

### Minor Changes

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-non-literal-fs-filename` now reports on reachable taint instead of on
  unproven constancy.

  Adjudicated against an 8-repo corpus, reading the real source at every site:
  **113 findings, 8 of them true — 7% precision.** The other 105 were rollup
  configs, gulpfiles, glob enumerations of a repo's own files, and thin fs
  facades forwarding their own parameter.

  The cause was one line:

  ```js
  // Any non-literal is dangerous
  return !pathNode || !isLiteralString(pathNode);
  ```

  That asks _"can I prove this is constant?"_ and reports whenever it cannot.
  Adding further constant-recognition was measured to reach only ~32% precision,
  because the question is backwards. A path is dangerous when an attacker can
  **steer** it, so that is what is asked now.

  Measured after: **113 → 9**, and the survivors are genuine — `process.env.TWILIO_CA_BUNDLE`,
  `process.argv[2]`, `env.processEnv.XDG_*`.

  **False negatives fixed at the same time**, all found during adjudication:

  - **Destructive methods were missing entirely.** `cp`, `cpSync`, `rm`, `rmSync`,
    `copyFile(Sync)`, `rename(Sync)`, `truncate(Sync)`, `symlink`, `link`,
    `utimes`, `chmod`, `open`, `opendir`. `Shopify/cli` `bin/update-bugsnag.js:36`
    does `fs.cpSync(sourceDirectory, …)` with `sourceDirectory` built from
    `process.argv[2]` — a recursive copy driven by argv, **silent**, while the
    harmless `mkdir` of a temp dir two lines above **reported**. The rule flagged
    the safe thing and missed the dangerous one.
  - **Only `arguments[0]` was ever examined.** `copyFile`, `cp`, `rename`, `link`
    and `symlink` all take a destination too. Now checked via a per-method index
    map.
  - **`fs-extra` and `graceful-fs` were invisible** despite re-exporting the whole
    fs surface under the same names. A test asserting `isFsModule('fs-extra')`
    was `false` had pinned this.

  Two new options: `taintSources` (default `['process']`) and
  `reportUnresolvedPaths` (default `false`, restores the previous contract).

  Request-sourced paths and function parameters are deliberately **not** taint
  roots here — `no-arbitrary-file-access` owns those at `error` and names user
  input as the cause. Listing them in both rebuilds the 25-site double-report the
  two rules were just separated to avoid.

### Patch Changes

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-non-literal-fs-filename` no longer reports paths that are fixed at
  build time.

  ```js
  const BUILD_DIR = path.resolve(__dirname, 'build');
  fs.readFileSync(`${BUILD_DIR}/package.json`); // was reported
  ```

  The safe-construction check already understood `path.join(__dirname, 'x')` —
  but only when it was the _direct_ argument. One hop through a `const` lost the
  verdict, which is why every rollup config, gulpfile and build script in the
  corpus reported.

  The check now resolves through `const` bindings, template literals, string
  concatenation, `__dirname`/`__filename` and `process.cwd()`, to a depth of 4
  so mutually-referential bindings terminate. `let` is deliberately excluded: it
  can be reassigned between the binding and the call, so proving its initializer
  constant proves nothing about the value actually read.

  Constant does **not** mean harmless — `path.join(__dirname, '../etc/passwd')`
  is fixed at build time and still traversal, and still reports.

  Measured on the 8-repo corpus: **122 findings → 113**. The remainder are paths
  genuinely assembled at runtime (`path.dirname(x)` over a config array, opaque
  helper calls), which this rule cannot clear without real taint analysis.

  The old `isSafePathConstruction` is deleted rather than left alongside: the new
  check subsumes it exactly, and two duplicate implementations of "is this path
  safe" would drift.

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-arbitrary-file-access` now reports only paths it can attribute to a request,
  instead of duplicating `detect-non-literal-fs-filename`.

  The rule's message is _"File path from user input — path traversal
  vulnerability"_. Its implementation flagged **any** unsanitized identifier, so
  it said that about build scripts and config loaders where no request exists.
  Two problems from one cause:

  - **The message was untrue.** `fs.readFileSync(configPath)` in a rollup config
    has no user input to point at.
  - **It duplicated `detect-non-literal-fs-filename` on 25 corpus sites** — the
    same line reported twice, at `error` and `warn`, for the same reason. A
    reader fixes it once and is told twice.

  The two rules now partition, the same way `no-innerhtml` and its source-specific
  sibling already do: this one reports what it can attribute, the generic one
  reports the rest. Exactly one rule owns a site.

  Attribution means a **function parameter** (untrusted by definition — the callee
  cannot see what a caller passes) or a local traced to `req` / `request` /
  `params` / `query` / `body`.

  Measured on the 8-repo corpus: **32 findings → 3**. Nothing goes undetected —
  `detect-non-literal-fs-filename` still reports every removed case at `warn`.

  Also fixes a false negative found on the way: the direct-member check read only
  the immediate object, so `fs.readFile(req.body.upload.path)` was missed. It now
  walks the whole chain.

- Updated dependencies [[`d86a8d8`](https://github.com/ofri-peretz/eslint/commit/d86a8d8de3e6fa4c404192365a7aa66c9646233d)]:
  - @interlace/eslint-devkit@1.14.0

## 4.10.0

### Minor Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-weak-hash-algorithm`: exempt hashes stored under a non-cryptographic name.

  ```ts
  // redis/ioredis lib/Script.ts:15
  this.sha = createHash('sha1').update(lua).digest('hex');
  ```

  SHA-1 _is_ used, so the detection was correct — but this is the EVALSHA script
  identifier the Redis wire protocol mandates. The algorithm is not the
  maintainer's choice, and no attack on SHA-1's collision resistance buys
  anything: the value indexes a script the server already holds. A maintainer
  reading `CWE-327 | CRITICAL` here correctly concludes the tool does not
  understand their code.

  A hash assigned to a name in `nonCryptographicNames` (default `sha`, `etag`,
  `cachekey`, `cachebuster`; matched case-insensitively with `_` and `-`
  stripped) is no longer reported. Measured over the 8-repo corpus: **7 findings
  → 6**, and the ioredis case goes to 0.

  The exemption is deliberately narrow — it is about where the value **lands**,
  not which API produced it. The rule walks out through the
  `.update(…).digest(…)` receiver chain and reads the assignment target. A hash
  that is returned, passed as an argument, compared, or stored under a computed
  key is still reported, so "call it `sha`" cannot become a way to silence the
  rule on a real security control. `nonCryptographicNames: []` disables the
  exemption entirely.

  The message now names the distinction, so a reader in the non-crypto case can
  tell which side they are on.

  Known remaining shape, not covered here: Shopify/cli's
  `packages/theme/src/cli/utilities/asset-checksum.ts` does `return md5(content)`
  from functions named `*Checksum`. The non-cryptographic name is on the
  enclosing function rather than an assignment target, and matching function
  names by substring would exempt `passwordChecksum` too — a worse trade than
  the two findings it removes.

### Patch Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-timing-unsafe-compare` no longer reports comparisons against constants.

  Measured over the 8-repo corpus scan: **106 findings → 26**, with the surviving
  26 being genuine timing-unsafe comparisons (`password !== confirmPassword`,
  `hash !== token.claims.at_hash`, `claims.nonce !== nonce`) rather than name
  collisions.

  Three guards, each keyed to evidence rather than to a name:

  - **A constant operand.** `revokedToken === 'access'` (okta/okta-auth-js
    `lib/oidc/dpop.ts:185`) cannot leak a secret — the value being compared
    against is in the source, not in the attacker's head. String literals were
    previously allowed through on the argument that
    `password === 'default_password'` is a real finding; it is, but as CWE-798,
    which `secure-coding/no-hardcoded-credentials` reports. Constant-time
    comparison against a credential printed in the source protects nothing.

  - **Boolean predicate names.** `prevState.isAuthenticated === state.isAuthenticated`
    (`lib/core/AuthStateManager.ts:44`) matched only because `isAuthenticated`
    contains `auth`. Comparing two booleans leaks one bit the caller already holds.

  - **Namespaced constants.** `name === IDX_STEP.SELECT_AUTHENTICATOR_AUTHENTICATE`,
    `authenticatorKey === AUTHENTICATOR_KEY.WEBAUTHN`,
    `err.name === Enums.AUTH_STOP_POLL_INITIATION_ERROR` — 73 of the 88 findings
    left after the first two guards.

    This guard requires **both** halves to carry the convention: a
    namespace-cased object (PascalCase or SCREAMING_SNAKE) _and_ a constant-cased
    property, on a non-computed member. Every one of those 73 findings satisfies
    both, and requiring both is what keeps it from swallowing real secrets:
    `userToken === credentials.API_TOKEN` still reports (`credentials` is an
    ordinary runtime value), as do `secrets[API_TOKEN]` (computed — the property
    name is unknowable) and `process.env.API_TOKEN` in both its dot and
    `process['env']` spellings.

  A _bare_ `API_KEY === expected` still reports. Constant casing alone is not
  evidence — the namespace is.

## 4.9.1

### Patch Changes

- [#500](https://github.com/ofri-peretz/eslint/pull/500) [`40be6ea`](https://github.com/ofri-peretz/eslint/commit/40be6ea87b958a597b870fb006701cf4fd00f7ff) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - lock-file: report once per project, not once per file

  The rule carried `let checked = false` inside `create()`, which reads as a
  once-only guard but is not one — ESLint calls `create()` per file, so the flag
  reset every time. Linting auth0/express-openid-connect produced 135 identical
  findings, at arbitrary lines such as `end-to-end/fixture/jwk.js:34`, for a
  single fact about the repository.

  The report is now keyed on the nearest `package.json`, at module scope so it
  survives across files. A directory with no manifest anywhere above it is not a
  JS project and is no longer reported at all.

- [#496](https://github.com/ofri-peretz/eslint/pull/496) [`4fc9b6a`](https://github.com/ofri-peretz/eslint/commit/4fc9b6abd3d5dbb1f6b21141bbb50a1eb488ddd7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - detect-suspicious-dependencies: stop reporting real packages as typosquats

  Edit distance alone cannot separate a typosquat from a package that merely has
  a similar name. At distance ≤ 2 the rule reported `preact` (one edit from
  `react`, and a deliberate dependency of okta/okta-signin-widget) and `recast`
  (two edits, the AST library jscodeshift is built on).

  Two changes. The threshold drops to a single edit, and the distance function
  now counts a transposition as one edit (Damerau) rather than two — so `raect`
  and `exprses`, the most common squat shape, are caught rather than lost to the
  tighter threshold. A short allow-list covers real packages that sit one edit
  from a popular name.

  Accusing a legitimate dependency of being an attack costs a great deal more
  than missing one squat, so a name now has to clear both gates before it is
  reported.

- Updated dependencies [[`82aebb4`](https://github.com/ofri-peretz/eslint/commit/82aebb405fb9267c22c3edcf97b74087053bc019)]:
  - @interlace/eslint-devkit@1.13.0

## 4.9.0

### Minor Changes

- [#461](https://github.com/ofri-peretz/eslint/pull/461) [`3dceb7f`](https://github.com/ofri-peretz/eslint/commit/3dceb7f1f090ecc003ce9bac68fc1f2cffcf5ff8) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-self-signed-certs` is now part of the `recommended` preset.

  `rejectUnauthorized: false` accepts any certificate, including a MITM's
  self-signed one, and is the most-cited Node TLS mistake there is. The rule
  already detected it correctly — it simply was not in any preset, so nobody
  running `recommended` had it enabled. ILB-CWE-Corpus scored CWE-295 as a miss
  for that reason alone.

  Measured over the 13-repo wild corpus (~1,900 files of real Express and NestJS
  code) before promoting: **0 findings**. Pure recall, no false-positive cost.
  Ecosystem corpus score moves TP 51 → 52, FN 18 → 17, FP unchanged at 11.

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

- [#309](https://github.com/ofri-peretz/eslint/pull/309) [`237a6b0`](https://github.com/ofri-peretz/eslint/commit/237a6b03313e2ea935999ee84b2a6c8af33e50bc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `meta.hasSuggestions` now matches what each rule actually emits.

  ILB-Remediation measured 27 rules where the declaration and the implementation
  disagreed: 22 declared `hasSuggestions: true` without ever passing `suggest:`
  to `context.report()` (IDE quick-fix menus advertising remediation that never
  arrives), and 5 emitted `suggest:` without the declaration (latent — ESLint
  throws on that combination as soon as one of those suggestions carries a real
  fixer).

  `eslint-plugin-mongodb-security` gains four real suggestions where the rewrite
  is mechanical:

  - `require-lean-queries` — appends `.lean()`
  - `no-unbounded-find` — appends `.limit(100)`
  - `no-debug-mode-production` — rewrites the flag to `process.env.NODE_ENV !== 'production'`
  - `require-tls-connection` — adds (or flips) `tls: true` in the connection options

  Every other dead declaration was removed rather than faked. A workspace lock
  (`scripts/__tests__/suggestions-meta-lock.test.ts`) now fails CI on either
  direction of the drift.

- [#417](https://github.com/ofri-peretz/eslint/pull/417) [`658368a`](https://github.com/ofri-peretz/eslint/commit/658368a967cb4daf7c8c4f96fa6a263d9cdc1d8d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Two more false-positive classes from the whole-ruleset sweep.

  **`no-timing-unsafe-compare`: 108 → 12 findings.** Two causes.

  An _existence check_ is not a secret comparison — `if (token !== undefined)`,
  `hash === null`, `signature.length === 0`. A timing attack needs an
  attacker-supplied operand on the other side; a sentinel leaks nothing.

  And `key` was in the default secret patterns, substring-matched. It hit `key`,
  `firstKey`, `keys`, and every AST walker's `key === 'text'` — 88 findings on this
  repo, none of them secrets. The names that actually denote a secret (`apiKey`,
  `privateKey`, `encryptionKey`, `accessToken`, …) are listed in full and still
  fire; a project that really does compare a bare `key` can add it back via
  `secretPatterns`.

  Word-boundary matching was tried first and dropped: it fixed `firstKey` but
  stopped matching `req.headers.authorization`, trading one false positive for a
  worse false negative.

  **`no-xxe-injection`: 76 → 1 finding.** `parse` was treated as an XML method
  name, so `JSON.parse(fs.readFileSync(file, 'utf-8'))` reported CWE-611. The
  XML-specific names (`parseFromString`, `parseXmlString`, `parseXML`,
  `parseString`) still match on the name alone; a bare `parse` now has to be
  positively identified as XML by its receiver, which drops `JSON.parse`,
  `Date.parse`, `path.parse` and `url.parse`. Allowlist rather than denylist, so a
  future `csv.parse` is silent by default.

  Every class is locked as `valid` cases and verified by reverting the guard.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 4.8.1

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

## 4.1.0 — 2026-05-03

### Added

- New rule `no-deprecated-buffer` — flags use of the deprecated `Buffer()` constructor (Node.js security advisory; `Buffer.from`/`Buffer.alloc` should be used instead). Enabled in the `recommended` preset at `warn` to avoid breaking adopters with legacy `Buffer()` calls; will be promoted to `error` in the next major.

### Bug Fixes

- `no-zip-slip`: removed redundant dangerous-destination check from the literal handler. Extraction-call handler already reports `dangerousArchiveDestination`; the literal-side check was producing duplicate errors and (separately) firing on unrelated calls like `fs.readFileSync('/etc/app/config')`.
- `lock-file`, `detect-child-process`: minor refinements (see source diff).

## 4.0.4 — 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))
- **rules:** reduce false positives across security rules ([c192233c](https://github.com/ofri-peretz/eslint/commit/c192233c))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 4.0.3 — 2026-02-06

### Bug Fixes

- ⚠️ **rules:** reduce false positives across security rules ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))
- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ⚠️ Breaking Changes

- **rules:** Some previously flagged patterns are now correctly allowed ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))

### ❤️ Thank You

- Ofri Peretz

## 4.0.2 — 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## 4.0.1 — 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## 4.0.0 — 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## 1.0.0 — 2026-01-26

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
