# eslint-plugin-secure-coding

All notable changes to `eslint-plugin-secure-coding` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 5.3.2

### Patch Changes

- **🐛 Fix** — five rules read a subscripted member the same as its dotted twin

  - `no-ldap-injection` refused every computed member when deciding whether a
    value came from the request, so `search(base, req.body['x'])` lost its taint
    entirely. Only a key chosen at runtime is refused now.
  - `no-improper-sanitization` gated three separate DOM-sink sites on
    `property.name`, including the one that decides whether an enclosing context
    is dangerous.
  - `no-template-injection` and `no-sql-injection` share a member-chain walker
    that skipped any non-Identifier segment, so `req['body'].template` read as a
    shorter chain than it is.
  - `no-graphql-injection` resolved the template tag the same way, missing
    ``apollo['gql']`...` ``.

  Every one keeps abstaining on a key chosen at runtime, and each abstain path
  is now pinned by its own case.

- **🐛 Fix** — `value['constructor'].name` is the same brittle type check

  `no-improper-type-validation` matched both levels of `data.constructor.name`
  on `property.name`, so the subscripted spelling read as something else
  entirely. A test had pinned that as intended under "inner is a COMPUTED
  member" — it reads exactly what the dotted form reads, and breaks across
  realm boundaries identically.

- **🐛 Fix** — `this['password']` and `req['body']` read the same as their dotted twins

  `no-hardcoded-credentials` resolved an assignment target off `property.name`,
  so `this['password'] = '…'` assigned the same secret to the same slot
  unreported. Both the detection and its label-context SUPPRESSION were widened
  together — widening one alone makes the subscripted spelling report where the
  dotted one does not.

  `no-privilege-escalation` was blind for a different reason: its user-input
  patterns match SOURCE TEXT, and `/\breq\.(body|query|params)\b/` cannot see
  `req['body']`. Its assignment side already resolved a string subscript, so a
  request value reached an authorisation field through the half that could not
  see it.

  Found by extending the computed-key probe from calls to member READS, which
  is how these two were reachable at all — neither appears in a call.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.2`

## 5.3.1

### Patch Changes

- **🐛 Fix** — `no-hardcoded-credentials` stops reporting error codes and build-tool paths

  Two false positives at CWE-798 / CVSS 9.8 / CRITICAL, tagged SOC2 PCI-DSS
  HIPAA GDPR, both in authentication libraries and both found the first hour the
  corpus scan could see again:

  - `auth0/express-openid-connect` — `MTLS_INCOMPATIBLE_CLIENT_AUTH:
'mtls_incompatible_client_auth'`, an error code. Every token but `mtls` is a
    dictionary word, and the vowel requirement in `isNaturalWordString` made that
    one abbreviation opaque the whole string. `jwt`, `xhr`, `sql` and `ssh` did
    the same.
  - `okta/okta-auth-js` — `const OktaAuth = '<rootDir>/build/cjs/exports/default.js'`,
    a Jest module map entry. `isUrlOrPath` accepts a scheme or a leading `/`, and
    a templated root is neither, so the value never reached the path guard.

  Detection is unchanged for real credentials. The abbreviation allowance applies
  only to values carrying no digits — a key shape keeps the vowel requirement,
  verified against real Stripe, GitHub, Google and Slack key formats — and only
  the templated ROOT is stripped, so an opaque segment after one is still
  reported.

- **🐛 Fix** — template text reads assert instead of concatenating null

  `@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
  typed it `string` and emitted the RAW text for an escape it could not cook,
  8.68.0 types it `string | null` and emits `null`. Both directions were verified
  against a real 8.54.0 install, not read off a changelog.

  `no-sensitive-data-exposure` and `no-improper-sanitization` join template quasis
  into the text they match against. Both are handed an argument node, where a
  tagged template arrives as `TaggedTemplateExpression` and an untagged one with a
  bad escape is a parse error, so `cooked` cannot be null there — the reads now
  say so rather than letting `null` fall into a `join`.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.1`

## 5.3.0

### Minor Changes

- **🐛 Fix** — six rules now see `o['k']` as the same access as `o.k`

  Each of these decided from `property.type === 'Identifier'`, so a string
  subscript slipped past and the rule went silent on code it reports in the
  dotted spelling. That is the notation bundlers and code generators emit, so the
  rules were reliably off on built output — where nobody is reading by eye either.

  - `no-sensitive-data-exposure` — `console['log']('password: 123456')`
  - `no-improper-sanitization` — `input['replace']('<', '&lt;')`
  - `no-unlimited-resource-allocation` — `Buffer['alloc'](req.query.size)`,
    `tar['extract']()`
  - `no-missing-authentication` — `router['get']('/admin/accounts', h)`
  - `no-xpath-injection` — `doc['evaluate'](expr)`
  - `no-format-string-injection` — `util['format'](userInput)`

  A genuinely dynamic `o[m]()` has no statically known method name and is still
  ignored; every
  rule gained a case pinning that.

### Patch Changes

- **🐛 Fix** — sanitiser, logger, postMessage and query gates read a subscripted member

  `DOMPurify['sanitize'](html)`, `container['logger'].warn(…)`,
  `w['postMessage'](data, '*')` and `User['find']({…})` each reach exactly what
  their dotted spellings reach. Six gates across three plugins compared
  `property.name` first.

  `no-log-injection` also carried two arms for the same question — an Identifier
  branch and a `staticString` fallback — where `propertyName` answers both.

  A test had pinned `container['logger']` as an unresolvable receiver; it holds
  the same logger, and the same unescaped username reaches the same log line.

- **🐛 Fix** — `no-hardcoded-credentials` stops reporting error codes and module paths

  Two CVSS 9.8 findings against the pinned corpus, neither a secret:

  - `MTLS_INCOMPATIBLE_CLIENT_AUTH: 'mtls_incompatible_client_auth'` in
    auth0/express-openid-connect. The key ends in `auth`, which opens the
    credential-context gate, and the value then clears the two-character-class
    test on its underscores. A secret is never its own key's name — whoever
    generated it did not consult the variable it would be stored in — so a value
    that folds to its own slot name is now read as the error code it is.

  - `const OktaAuth = '<rootDir>/build/cjs/exports/default.js'` in
    okta/okta-auth-js, a jest `moduleNameMapper` target. A `<token>` root is a
    path root; the path check now strips it rather than failing on the missing
    leading slash.

  Both discriminators are structural relations, not new word vocabulary. A value
  that merely resembles its key is still judged on its shape.

- **🐛 Fix** — sixteen rules read a member spelled with a string subscript

  `Object['assign'](target, source)` performs the same uncontrolled merge as
  `Object.assign`, `list["length"]` is the language's `.length`, and
  `obj['hasOwnProperty'](k)` is the same guard. Sixteen rules compared
  `property.name` before asking what the property was.

  `no-electron-security-issues` carried its own local `propertyName` that
  refused any computed key, so `{ ['nodeIntegration']: true }` in a
  `webPreferences` block was invisible too. It now uses the devkit's
  `objectKeyName`, which resolves the quoted form.

  Three tests had pinned the miss, one of them a false positive:
  `list["length"] == 3` was reported as a loose-equality type check while the
  dotted `list.length == 3` was exempt.

- **🐛 Fix** — `ng['$compile'](tpl)` compiles the same directive template

  `no-directive-injection` named its compile method off `property.name`, so the
  subscripted spelling of `$compile`, `$interpolate`, `compile` and `template`
  reached nothing.

- **🐛 Fix** — template compilation and token generation read a subscripted method

  `Handlebars['compile'](userTemplate)` compiles the same attacker-supplied
  template `Handlebars.compile` does, and a reset token built from
  `Math['random']()` is exactly as guessable as one built from `Math.random()`.

  Two more tests had pinned the miss. One listed `Handlebars['compile']` beside
  `Handlebars[methodName]` as though they were the same refusal — the first
  names `compile`, the second has no statically known method name. The other was titled after the
  coverage branch it existed to execute, "computed require method access (id 85
  FALSE)", and asserted that `s['unserialize'](userInput)` was safe.

- **🐛 Fix** — `console['log'](user.email)` logs the same PII as `console.log`

  `no-pii-in-logs` compared `property.name` to its console-method list, so the
  subscripted spelling wrote PII to the same stream unreported. A method chosen
  at runtime still names no sink and is still skipped.

- **🐛 Fix** — log levels, deserialisers and fs reads resolve a subscripted method

  `console['log'](…)` writes at the same level, `yaml['load'](req.body.data)`
  deserialises the same request body, and `fs['readFileSync'](p)` yields the same
  untrusted bytes. `no-log-injection`, `no-unsafe-deserialization` and
  `no-weak-password-recovery` compared `property.name` first.

  Two more tests had pinned the miss, one of them named after the coverage branch
  it existed to execute — "computed callee property (id 9 FALSE)" — asserting
  that `yaml['load'](req.body.data)` was safe.

- **🐛 Fix** — `parts['join'](' ')` concatenates the same SQL statement

  `no-sql-injection` matched the array join on `property.name`, so fragments
  carrying a request value were assembled into a query unreported.

- **🐛 Fix** — LDAP, privilege and loop gates resolve a subscripted member

  A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
  compared `property.name` before asking what the property was. They now resolve
  through the devkit's `propertyName`, which still abstains on the one shape that
  genuinely cannot be resolved: a key chosen at runtime, whose name is not
  statically known.

- **🐛 Fix** — three blind spots that lived in a selector, a regex and a substring list

  `doc['evaluate'](q)` never set the module's "this file evaluates XPath" flag,
  because the visitor selector read `MemberExpression[computed=false] >
Identifier.property`. `password['trim']().length < 6` lost its receiver.
  `Date['now']() + salt` matched neither of the literal substrings
  `'Date.now()'` / `'Math.random()'` — that arm now reuses the rule's own
  `usesPredictableSource`, so there is one definition rather than two.

- **🐛 Fix** — LDAP escapes and role checks read a subscripted method

  `esc['filterValue'](x)` escapes exactly as `esc.filterValue(x)` does — this one
  sits in a SUPPRESSION path, so missing it meant reporting code that was
  already escaped. `guard['isAdmin'](user)` is the same role check, and
  `this['baseDN']` names the same field.

- **🐛 Fix** — `Object['keys']` and `graphql['execute']` name the same operations

  `detect-object-injection` matched the mass-assignment source on
  `property.name`, so `for (const k of Object['keys'](req.body))` was not
  recognised as enumerating caller-supplied keys. `no-graphql-injection` missed
  both its execute surface and its safe-caller allowlist the same way — the
  second of those is a suppression path, so missing it reported queries that
  were already safe.

- **🐛 Fix** — `userService['elevate'](user, level)` is the same privilege operation

  `no-privilege-escalation` resolved the operation name off `property.name`, so a
  subscripted elevate/promote/grant call was not recognised as one.

- **🐛 Fix** — `client['search'](baseDN, filter)` runs the same LDAP query

  `no-ldap-injection` matched the query method on `property.name`, so a
  subscripted `search`/`bind`/`modify` carried the interpolated filter
  unreported.

- **🐛 Fix** — `db['query'](sql)` is the same SQL sink as `db.query(sql)`

  `no-sql-injection` resolved the method name in two branches — a non-computed
  Identifier, then a string-literal subscript — where `propertyName` answers
  both. Resolving a key through a BINDING (`db[QUERY]` where `const QUERY =
'query'`) is what the function is really for, and that arm stays.

- **🐛 Fix** — XPath, password-length, fail-open and regex gates read a subscripted member

  `doc['evaluate'](q)` runs the same query, `password['length'] < 6` is the same
  weak check, `okta['verifyAccessToken'](t)` inside a catch-returns-granted still
  fails open, and `res['text']()` is the same untrusted read.

  `RegExp['escape'](s)` is a SUPPRESSION path — missing it meant reporting a
  pattern that had already been escaped.

- **🐛 Fix** — `Math['random']()` is recognised as the same weak token source

  `no-weak-password-recovery` detects predictable generators by matching SOURCE
  TEXT, and every pattern was written dotted-only — `/\bMath\s*\.\s*random\s*\(/`.
  A reset token built from `Math['random']()` is exactly as guessable, and the
  regex never saw it. The patterns now accept either spelling and still reject a
  runtime key such as `Math[pick]()`.

- **🧹 Refactor** — injection and privilege checks resolve a property once, not twice

  `SET.has(propertyName(node) as string)` reaches the right answer for the wrong
  reason. `propertyName` returns `string | null` because `o[k]` names a property
  the AST cannot read, and that is not the same answer as "named, and not one of
  these" — the cast collapses both, and `Set.prototype.has(null)` being false is
  what made it look correct.

  30 sites across 18 files now ask the two questions separately, via
  `namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

  No rule behaviour changes: this package's test count and coverage are unchanged.

- **🐛 Fix** — `ipcRenderer['send'](...)` and `app['get'](...)` name the same call

  `no-electron-security-issues` resolved the IPC method off `property.name`, so
  a subscripted `send`/`invoke`/`handle` crossed the same bridge with the same
  payload unreported. `no-missing-authentication` resolved a route registration
  and a middleware reference the same way, so `app['get']('/api/users', h)`
  registered an unguarded route in silence.

  Both were found by teaching the computed-key probe to honour each case's own
  options: 1,077 of the ledger's TP cases carry options and had been probed
  under defaults, so a case that only fires when configured looked like a case
  that never fired.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.0`

## 5.2.2

### Patch Changes

- **🐛 Fix** — Add an install-size badge to the README prelude, linking to each package's packagephobia page. npm renders the README from the last publish, so a badge only appears on npmjs.com after a release.

  Install size rather than bundle size: bundlephobia measures a browser bundle,
  and nobody bundles an ESLint plugin into one, so the number would describe no
  real cost. It was also returning `429` for every package, `react` included.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.2`

## 5.2.1

### Patch Changes

- **🐛 Fix** — Stop pointing readers at retired package names. `secure-coding`'s "extend your coverage" block linked `eslint-plugin-jwt` and `sequelize-security`'s prose named `eslint-plugin-pg` — both deprecated on npm since #414, and following either installs the frozen pre-rename build rather than the maintained one.

## 5.2.0

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

- **✨ Feature** — **✨ Feature** — `no-insecure-comparison` gains `reportLooseEquality`

  The rule reports two different claims under one name. `token === expected` is an
  authentication bypass; `if (e.code == 'MODULE_NOT_FOUND')` is type coercion,
  which `eqeqeq` already covers and most projects already run.

  Setting `reportLooseEquality: false` keeps the first and declines the second:

  ```json
  "secure-coding/no-insecure-comparison": ["error", { "reportLooseEquality": false }]
  ```

  Default is `true`, so nothing changes unless you opt in.

  A secret is never silenced by the option. `apiKey == provided` still reports —
  loose equality on a credential is worse than strict, not better, because it adds
  coercion to a comparison that already leaks by short-circuiting.

- **✨ Feature** — **✨ Feature** — `no-hardcoded-session-tokens` gains `sessionWords`

  The rule reports two independent things and only one was ever ours to guess.

  A JWT (`eyJ…`, RFC 7519) and a `Bearer`-prefixed value (RFC 6750) are published
  **formats**: they report on the literal's value whatever the binding is called,
  and no option silences them.

  The other half was a **name** test — `session` and `token`, hardcoded in
  English. A project whose session id is `sesion`, `sitzung` or `koneksi` got
  nothing from it and had no way to ask. `sessionWords` REPLACES that list:

  ```json
  "secure-coding/no-hardcoded-session-tokens": [
    "error",
    { "sessionWords": ["session", "sesion", "sitzung"] }
  ]
  ```

  Default unchanged, so nothing moves unless you set it.

- **✨ Feature** — `detect-weak-password-validation` takes `passwordWords`

  The rule decided what counts as a credential from `password|passphrase|passwd|
pwd|pass` — our guess at how a codebase spells it, not a specification. A
  project whose field is `secret` or `kennwort` matched none of it, so the rule
  silently judged nothing. `passwordWords` replaces the list.

  The eight-character floor stays fixed and now cites NIST SP 800-63B 5.1.1.2,
  because that one is a published requirement rather than a preference.

  It also compared `node.property.name` directly, so `body['password'].length < 6`
  reached the same property by a spelling the rule could not see. It now resolves
  the property through `propertyName`.

- **✨ Feature** — **✨ Feature** — `no-unsafe-regex-construction` gains `requestRootNames`

  The rule already did half of this correctly: the name **selects** a candidate
  inbound request, and `isInboundRequestBinding` then **decides**, requiring a
  handler parameter — so a module-local `const request = Object.freeze({…})` was
  never treated as a request whatever it was called.

  But the selecting list was `req | request | ctx | event | message`, and Express,
  Koa and Lambda all take the request **positionally**. A handler written
  `(inbound, outbound)` or `(payload)` never got as far as the binding check.
  Nothing publishes those words; they were our guess.

  ```json
  "secure-coding/no-unsafe-regex-construction": [
    "error",
    { "requestRootNames": ["req", "inbound", "payload"] }
  ]
  ```

  Default unchanged, so nothing moves unless you set it.

  What stays hardcoded, and now says why: `RegExp`, `RegExp.escape` and `source`
  are ECMAScript, and `process.argv` is Node's — a project cannot rename them,
  and an option for them would never be set.

- **✨ Feature** — **🐛 Fix** — `no-sql-injection` reads a request by SHAPE, not by the name `req`

  The rule decided whether a value came from an HTTP request by looking at the
  spelling of the binding it came from. A handler written `(request, reply)` —
  Fastify's own convention — was invisible to it, and a local array called `req`
  was treated as untrusted input.

  It now asks a structural question: is this a read of `.query` / `.params` /
  `.headers` / `.cookies` (or API Gateway's `queryStringParameters` /
  `pathParameters` / `multiValueHeaders`) off something that ARRIVED as a
  parameter? A request is handed to you; it is not constructed locally, whatever
  it is called.

  `body` needs one more level of depth before it counts, because `body` is also
  the commonest property name in this ecosystem.

  If you have narrowed `requestRoots` yourself, your list still wins — the
  shape-based path applies only while that option is at its default.

- **✨ Feature** — **✨ Feature** — the names these rules look for are yours to state

  `no-hardcoded-credentials` and `no-unlimited-resource-allocation` carried
  hardcoded English identifiers and treated them as fact: a variable had to be
  called `secret` to be a credential, `limit` to be a bound. A project that names
  its bindings in another language, or behind a domain vocabulary, was
  unreachable — and the list was written down nowhere a consumer could read it.

  New options, each REPLACING the default rather than extending it, so a consumer
  who states their vocabulary is not still measured against ours:

  | Rule                               | Option                               |
  | ---------------------------------- | ------------------------------------ |
  | `no-hardcoded-credentials`         | `credentialWords`                    |
  | `no-unlimited-resource-allocation` | `sizeProperties`, `limitOptionNames` |

  ```json
  "secure-coding/no-hardcoded-credentials": ["error", { "credentialWords": ["sigilo", "chave"] }]
  ```

  Defaults are unchanged, so nothing moves unless you set the option.

  What is NOT configurable, deliberately: a vendor's key FORMAT. `sk_live_…`,
  `ghp_…`, `AKIA…` are somebody else's published contract, not our guess at
  yours, so the rule still reports those on value alone — even when you have
  replaced the name vocabulary entirely.

### Patch Changes

- **🐛 Fix** — **🐛 Fix** — `no-unsafe-regex-construction` reported on dynamic flags alone

  Found by running the rule against code written specifically to break it, and
  pinned by a case that fails on the unfixed rule.

  The rule reported when only the FLAGS were dynamic and the pattern was a
  literal. Flags cannot introduce catastrophic backtracking on their own, so
  that finding was never actionable.

- **🐛 Fix** — `no-mutable-exports` resolves bindings instead of grepping the file text

  The `export { x }` path built a regex from the declarator's name and tested it
  against the whole source. That reported on the characters appearing in a
  comment or a string, reported a local `let x` when the file re-exported some
  other module's `x`, reported a function-scoped `let` colliding with an
  exported name, and missed every export it could not spell: a multi-specifier
  list, a rename, and a destructured declarator. It now resolves the specifier
  through the scope chain to the declaration it actually names.

  `no-env-injection` gains `requestRootNames`, which REPLACES the request-root
  list that `extraRequestRoots` could only grow.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.0`

## 5.1.4

### Patch Changes

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

- **🐛 Fix** — `no-xxe-injection` reported `parseFromString(text, 'text/html')`.

  HTML has no DOCTYPE entity subset, so `text/html` cannot carry an external
  entity at any configuration. The same method parses XML and HTML, and the MIME
  type is the whole question.

  passbolt/passbolt_styleguide — an open-source password manager — uses exactly
  this to strip markup out of a progress message:

  ```js
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent;
  ```

  A sanitisation idiom, reported as CWE-611. A non-literal second argument
  decides nothing and still reports.

- **🐛 Fix** — `no-unsafe-deserialization` reported `yaml.load()` on repositories pinned to js-yaml v4.

  v4's `load` is what v3 called `safeLoad` — `DEFAULT_SCHEMA` carries no
  `!!js/function` tag and the unsafe v3 `load` is gone. The rule's own comment
  said it "cannot see which major is installed". It can: the manifest declares
  it.

  The lookup walks up from the linted file to the nearest `package.json`, so a
  package inside a monorepo reads its own, and caches per directory. Nothing
  declared, or a range with no digits in it, means nothing is known and the
  finding stands.

  Found on dwp/govuk-casa — the UK Department for Work and Pensions' service
  framework — where it was the single finding across 156 files.

- **🐛 Fix** — two more false positives, found by rescanning after the last batch shipped.

  `require-csp-headers` matched the method name `render` on any receiver.
  `nunjucksEnv.render(template, data)` returns a string; only `res.render(view)`
  emits a response. On ministryofjustice/hmpps-arns-assessment-platform-ui that
  was 31 reports — every Nunjucks component module and every component test — in
  a repository that already sets a nonce-based CSP in middleware. Gated on the
  receiver, and the rule now takes `skipTestFiles`, which covered 29 of the 31.
  Down to 3.

  `no-missing-authentication` treated `app.get('port')` as a route. Express
  overloads the name: one argument reads a setting, two or more registers a
  route. `app.listen(app.get('port'), …)` was reported as an unauthenticated
  endpoint. A route always has a handler after its path, so the arity test is
  exact — and the `app.route(path).get(handler)` chained form, where the path
  comes from the previous call, keeps reporting.

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

## 5.1.3

### Patch Changes

- **🐛 Fix** — Three false positives found by reviewing findings on real repositories. ([#678](https://github.com/ofri-peretz/eslint/pull/678))

  `no-sql-injection` no longer reports an identifier narrowed by an allowlist.
  No driver binds a table or column name, so an allowlist plus a guard clause is
  the correct fix for that case and is what the standard advice prescribes.
  bcgov/sso-requests wrote exactly that — `if (!ALLOWED_TABLES.has(table)) throw`
  above the query, with a comment explaining why — and the rule reported the
  defence as the vulnerability. The check is deliberately narrow: the guard must
  `throw` or `return`, and the allowlist must be a fixed list of literals, so a
  membership test that falls through or an allowlist passed in by the caller still
  reports.

  `no-fail-open-auth` now skips test files. It had no test handling at all, and
  reported a mock component inside `__tests__` written to exercise exactly this
  rule's subject.

  Storybook stories are recognised as development material, so a
  `password: "<test password>"` on a story for a user called John Doe is no
  longer a hardcoded credential. A story never enters the application bundle.

  Verified against the repositories that produced them: bcgov/sso-requests drops
  from 4 SQL findings to 1, cds-snc/canadalogin-user-selfservice-webapp from 11 to
  6, and a genuine unparameterised request header in a query still reports.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.2`

## 5.1.2

### Patch Changes

- **🐛 Fix** — `no-xpath-injection` no longer reports React Router wildcard paths. ([#671](https://github.com/ofri-peretz/eslint/pull/671))

  `<Route path={`/${locale}/*`} element={<LocaleRoutes />} />` was reported as
  XPath injection at CVSS 9.8 — twice in a city government's application, in files
  containing no XPath, in a repository importing no XPath package. `/*` is XPath's
  abbreviated `child::*` and also React Router's wildcard segment.

  The wildcard step alone is now treated as weak evidence and needs corroboration
  from the module: an import from an XPath package, or a DOM XPath API. Every
  other marker — `//name`, `[@attr`, a named axis, `text()` — still reports on its
  own, because nothing else in a JavaScript codebase is spelled that way.

  This is the doctrine the rule already applied to bare calls, where `select` and
  `evaluate` were reporting CWE-643 in files containing no XML: the import is the
  evidence, the shape never was. The template path simply never applied it.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.1`

## 5.1.1

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

## 5.1.0

### Minor Changes

- [#589](https://github.com/ofri-peretz/eslint/pull/589) [`89f4b6d`](https://github.com/ofri-peretz/eslint/commit/89f4b6d5cfda758e49be299ceed1aa32c490e65c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-redos-vulnerable-regex` can now ask the oracle for the **degree** of
  backtracking, not just whether a pattern is vulnerable at all — exposed as
  `reportSecondDegreePolynomial`.

  It defaults to `true`, so **default behaviour is unchanged**: quadratic
  patterns still report. Set it to `false` to suppress degree-2 findings in a
  codebase whose patterns provably run over short, sized input.

  ```
  (.*?)=(.*)$     degree 3, over a 4KB cookie header — ~6e10 steps, a hang
  ^###\s+(.+)$    degree 2, over one markdown heading — arithmetic
  ```

  That difference is real — on the pinned 8-repository corpus, every finding was
  oracle-confirmed and none was exponential, three at degree 3 and three at
  degree 2 — but degree only _proxies_ the question that decides whether anyone
  acts: does the caller size the input? Nothing in the AST answers that. Shipping
  the suppression as the default dropped a must-detect CWE-1333 pattern
  (`/^(a*).*b/`, degree 2), so the quieter bar is opt-in and costs recall by
  construction.

  The veto-only invariant is unchanged: the oracle may only ever REMOVE a
  finding. A null degree — `recheck` absent, timed out, or unparseable — retracts
  nothing, so uninstalling the optional peer can still only add findings, never
  hide one.

### Patch Changes

- [#589](https://github.com/ofri-peretz/eslint/pull/589) [`89f4b6d`](https://github.com/ofri-peretz/eslint/commit/89f4b6d5cfda758e49be299ceed1aa32c490e65c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-sensitive-data-exposure` no longer reports when the surrounding prose names
  a credential but the interpolated value names itself an outcome.

  ```js
  // no longer reported — the label describes the operation that FAILED
  throw new Error(`Failed to fetch access token: ${error.message}`);
  throw new Error(`Token request failed with status ${tokenResponse.status}`);

  // still reported — these log the credential itself
  console.log(`Using token from ${source}: ${tokenFromEnv}`);
  console.log(`Using password from dev: ${password}`);
  ```

  On the pinned 8-repository corpus this rule produced six findings. Four were
  the first shape and leaked nothing; two were the second and are real. The
  property is structure and the label is prose, so the property wins.

  Two report paths had to close, not one. The text heuristic matched
  label-separator-hole, and the value path separately matched
  `tokenResponse.status` by reading the **receiver's** name and ignoring what was
  taken from it — the same defect `VALUE_FREE_PROPERTIES` already fixed for
  `.length`, one property set over.

  The new `DIAGNOSTIC_ACCESSORS` set is protocol-grounded rather than
  vocabulary: `message` / `stack` / `name` are `Error.prototype`'s own, and
  `status` / `statusText` are the HTTP response code and reason phrase. `code` is
  deliberately excluded — an authorization code, a 2FA code and a recovery code
  are all called `code`, and the rule cannot tell them apart.

  Recall is unchanged: CWE corpus 69/69, zero false positives.

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

## 4.3.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [[`20b22aa`](https://github.com/ofri-peretz/eslint/commit/20b22aab4cf3f49f9c3f72b8235550b55db92fb8)]:
  - @interlace/eslint-devkit@1.16.0

## 4.2.0

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

## 4.1.0

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

## 4.0.0

### Major Changes

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unsafe-deserialization` no longer reports `JSON.parse` as CWE-502.

  ```js
  function parseJSON(jsonString) {
    return JSON.parse(jsonString);
  } // was CVSS 9.8
  app.post('/x', (req, res) => {
    JSON.parse(req.body);
  }); // was CVSS 9.8
  ```

  `JSON.parse` cannot instantiate objects, invoke constructors, or execute code.
  It is the **remediation** for CWE-502 — and this rule's own message text says
  so: _"Use JSON.parse() or safe deserialization libraries"_. It was telling
  people to replace the fix with itself, at CRITICAL severity.

  The branch responsible reported any `safeLibraries` member (`JSON.parse`,
  `yaml.safeLoad`, protobuf, msgpack) whenever its argument looked untrusted,
  justified by a comment that even `JSON.parse` "can be unsafe if used on complex
  objects that get eval'd later". That is speculation about a _different_ sink; if
  something later evals the result, `dangerousEvalUsage` reports the eval.

  Adjudicated against an 8-repo corpus: **33 findings, 0 true positives.** 31 were
  this branch, most on plain `parseJSON(jsonString)` utilities. Now **33 → 2**,
  and both survivors are `new Function(...)` in minified vendor bundles.

  **A false negative is fixed in the same pass.** `isUntrustedInput` never
  unwrapped `AwaitExpression` or `CallExpression`, so the _more_ dangerous form
  was the one being missed:

  ```js
  function run(code) {
    eval(code);
  } // reported
  async function f(res) {
    eval(await res.text());
  } // SILENT — now reports
  ```

  Reading a response body (`.text()`, `.json()`, `.arrayBuffer()`, `.formData()`,
  `.blob()`) or a file now counts as untrusted at any depth.

  **Breaking:** the `untrustedDeserializationInput` message id is removed —
  nothing can emit it. Suppressions referencing it by id should be deleted.

### Patch Changes

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unlimited-resource-allocation` now judges **what** is allocated instead of
  whether the printed callee text contains `Buffer`.

  The old check asked: is this call inside any loop, and does
  `sourceCode.getText(callee)` contain `alloc`, `Array`, `Buffer`, `Map`, `Set`,
  `readFile` or `writeFile`? No provenance, no size, no bound. Adjudicated against
  an 8-repo corpus that was **37 of the rule's 43 findings, every one false**:

  | Reported                           | Why it was wrong                                                                                       |
  | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
  | `Buffer.byteLength(arg)`           | A read-only size **probe**. Allocates nothing.                                                         |
  | `this.#decodeArrayItems.bind(…)`   | Matched via `.bind` containing `Array`.                                                                |
  | `new Set()`                        | Zero args, so the numeric-literal escape could never apply — _every_ `new Set()` in any loop reported. |
  | `stringArray.push(x)`              | Matched on the **variable** name.                                                                      |
  | `for (var e = Array(t), u = 0; …)` | The allocation is in the for-**init** and runs once.                                                   |

  The sharpest one: `Shopify/cli` `system.ts:437` was flagged on the size cap
  itself — the next lines throw `Stdin input exceeded the maximum allowed size`.
  The rule reported the mitigation for its own finding.

  Three requirements now, each of which the substring heuristic lacked:

  1. The callee is an allocator, matched **exactly** — `Buffer.alloc`,
     `Buffer.allocUnsafe`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet` and their
     `new` forms. `Buffer.byteLength` and `Array.isArray` are not allocations.
  2. There is a size argument and it is not a numeric literal.
  3. It is in the loop's **body**, not its init.

  Genuine unbounded allocation in a loop still reports —
  `while (c) { new Array(dynamicCount); }` — as does the `new` spelling, which
  previously needed its own duplicate heuristic. Filling a pre-sized container
  (`buffers[i] = Buffer.alloc(n)`) stays exempt.

  Measured: **43 findings → 6.**

- [#537](https://github.com/ofri-peretz/eslint/pull/537) [`5979bf8`](https://github.com/ofri-peretz/eslint/commit/5979bf86d5985df0f2d45bc3f4519c56cb6d5bef) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Remove two vestigial package-level lockfiles that carried vulnerable transitive dependencies.

  These sat inside an npm-workspaces package where the root lockfile governs. They pinned
  `ajv@6.12.6` and `brace-expansion@1.1.12/2.0.2`, which carry a ReDoS and three DoS advisories.

  They were not reachable by any install path. `npm ci` from inside the package directory resolves
  against the root lockfile and installs the fixed `ajv@6.15.0` / `brace-expansion@2.1.4`; with
  `--workspaces=false`, or from a copy outside the workspace, `npm ci` fails outright because the
  files are stale enough to be internally inconsistent (they pin `@interlace/eslint-devkit@1.2.1`
  against a current `1.13.0`). `package-lock.json` is also excluded from published tarballs, so
  consumers never saw them either.

  The impact was on scanners, not installs: OSV reads lockfiles off disk regardless of npm's
  resolution rules, so these two files alone produced all 29 vulnerabilities in the OpenSSF
  Scorecard report while `npm audit` at the root stayed clean.

- Updated dependencies [[`d86a8d8`](https://github.com/ofri-peretz/eslint/commit/d86a8d8de3e6fa4c404192365a7aa66c9646233d)]:
  - @interlace/eslint-devkit@1.14.0

## 3.7.1

### Patch Changes

- [#534](https://github.com/ofri-peretz/eslint/pull/534) [`a9b0b14`](https://github.com/ofri-peretz/eslint/commit/a9b0b146e191c4ec1d2608a67019f0f670f1d581) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-improper-sanitization` no longer reports `.length` interpolated into markup.

  ```js
  res.send('<p>' + arr.length + '</p>'); // was reported, twice
  ```

  `.length` is a number in every JavaScript engine, so there is nothing to
  escape. Found while measuring `express/examples/online/index.js:53` for [#398](https://github.com/ofri-peretz/eslint/issues/398).

  Non-computed access only. `data[length]` reads a _variable_ named `length`,
  which carries whatever that variable holds, so it still reports — the exemption
  must not become a way to smuggle an attacker-controlled key past the check.

  Note this does **not** change the Express finding count: that line is
  `'<p>Users online: ' + ids.length + '</p>' + list(ids)`, and `list(ids)` is an
  unsanitized call reaching an HTML sink, which is a legitimate finding.

## 3.7.0

### Minor Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-directive-injection`: stop reporting correct DOMPurify calls, start
  reporting the ones that disable sanitization.

  The reported false positive does not reproduce —
  `DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })` is not reported, and
  the rule produces 0 findings for it across the 8-repo corpus. It is now locked
  as a `valid` fixture, along with the spelled-out form and seven adjacent
  shapes, so the recommended safe pattern can never regress into a finding again.

  The issue's _other_ acceptance criterion was failing, and that turned out to be
  the real defect: a genuinely unsafe sanitizer config was silently accepted.

  ```js
  DOMPurify.sanitize(html, { ADD_TAGS: ['script'] }); // was: no finding
  DOMPurify.sanitize(html, { ADD_ATTR: ['onerror'] }); // was: no finding
  ```

  Both hand back markup that executes, while still reading as sanitized at the
  call site — the worst shape a security rule can miss, because the code looks
  defended. `ADD_TAGS`/`ALLOWED_TAGS` naming `script`, `iframe`, `object`,
  `embed` or `base`, and `ADD_ATTR`/`ALLOWED_ATTR` naming an `on*` handler,
  `srcdoc`, `formaction` or `xlink:href`, now report under the new
  `unsafeSanitizerConfig` message, which names the offending option and value.

  The check is narrow by construction: the receiver's name must mention
  "purify", the config must be an object literal, and the values must be literal
  strings in an array. A `{ ALLOWED_TAGS }` shorthand referencing a constant
  defined elsewhere is left alone — assuming the worst about an unreadable value
  is what produced the original false positive.

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-hardcoded-credentials`: `allowInTests` now defaults to `true`.

  The issue asked which of two things was broken — the option not being read, or
  its filename patterns not matching `integration/*.test.js`. Measured: neither.
  The option is read, and `filename.includes('.test.')` matches that path. It
  simply defaulted to `false`, and `configs.recommended` registers this rule as
  bare `'error'` with no options, so the exemption was never switched on for
  anyone using the recommended preset.

  The effect on a real repository was 17 of 18 findings being fixtures in
  `integration/auth.test.js` — roughly 94% noise in the default configuration of
  any project with tests.

  A credential in a test fixture is not an exploitable finding for this rule.
  Committed real secrets are a secret-scanning problem — gitleaks and trufflehog
  scan history and drive key rotation, neither of which a linter can do.

  Production paths are unchanged: `const password = "supersecret123"` in
  `src/app.js` still reports. Set `allowInTests: false` for the previous
  behaviour.

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-redos-vulnerable-regex`: an invalid regex is no longer reported as a ReDoS
  vulnerability, and the heuristic layer that did so is removed.

  `new RegExp("(a+")` is a real bug, but it is not _this_ bug: it throws at
  construction and can never backtrack. The rule reported it as
  `Nested Quantifier Pattern: exponential backtracking | CRITICAL`, because the
  removed layer matched the pattern **text** against a table of quantifier
  shapes and found `(a+` convincing. Parse failure is now terminal — no report.

  With that separation made, the heuristic layer had nothing left to do: a
  pattern either fails to parse (not a regex) or reaches the NFA analyser (which
  returns a verdict). Its only remaining effect was overruling clean verdicts, so
  it is gone, along with the `useAtomicGroups`, `usePossessiveQuantifiers`,
  `restructureRegex` and `useSafeLibrary` suggestions it produced.

  `allowCommonPatterns` is accepted and ignored rather than removed, so configs
  that set it keep loading. It gated the deleted layer. Removed in the next major.

  `maxPatternLength` is unaffected. Catastrophic patterns are unaffected:
  `/(a+)+b/`, `/(a+)(a+)b/`, `/(a+)+$/` and `/(\w+\s?)*$/` all still report.

### Patch Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-redos-vulnerable-regex` no longer overrules its own NFA analysis with
  character-counting heuristics.

  Measured over the 8-repo corpus scan: **61 findings → 35**, with every survivor
  NFA-confirmed. The reported false positive is gone —
  `stripe/stripe-js` `src/shared.ts` goes from 3 findings to 0.

  The rule runs `scslre` (the NFA analyser `eslint-plugin-regexp` uses) and then
  falls back to a table of regexes-matching-regex-source. Those two layers
  communicated through a boolean, so "scslre analysed this and it is safe" and
  "scslre could not analyse this" were the same value — and every pattern the NFA
  cleared was handed straight to the heuristics, which then reported it anyway.

  That is how

  ```js
  const V3_URL_REGEX = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
  ```

  was reported as `Nested Quantifier Pattern: exponential backtracking | CRITICAL`.
  It is anchored at both ends, has two independent optional groups, no nesting,
  and is linear. The heuristic `\([^)]*[+*?][^)]*\)[+*?]` matched only because
  `(\?.*)?` contains a `?`, a `*`, and a trailing `?`: quantifier characters
  counted, not quantifier nesting.

  `checkWithScslre` now returns `reported` / `clean` / `unanalysable`, and the
  heuristics run only on `unanalysable`. `new RegExp("…")` with a string literal
  gets the same NFA analysis as a `/…/` literal — it previously skipped straight
  to the heuristics, so the Stripe shape written as a constructor call produced
  the identical false positive. Flags passed as the second argument now reach the
  analyser, which matters because `i` changes what a quantifier can consume.

  Catastrophic patterns are unaffected: `/(a+)+$/` and `/(\w+\s?)*$/` still
  report, as do `/(a+)+b/` and `/(a+)(a+)b/`.

  Three fixtures that asserted `/(a|b)+c/`, `/.*.*/` and `/(a+)?/` were _invalid_
  existed to reach the heuristic layer for coverage, and in doing so pinned three
  false positives. All three are linear; they are `valid` locks now.

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-sensitive-data-exposure` now reads property accesses and template literals
  in logging calls.

  The logging path handled `Literal`, `+` concatenation and bare `Identifier`
  arguments only, so the two most common ways a secret actually reaches a log
  line were silent:

  ```js
  console.log(user.password); // was not reported
  console.log(`token=${t}`); // was not reported
  ```

  Both report now. A template is read only when something is interpolated — a
  template with no expressions is a constant string, and reporting it would be
  the same prose false positive the literal guard already prevents.

## 3.6.1

### Patch Changes

- [#490](https://github.com/ofri-peretz/eslint/pull/490) [`0fed33e`](https://github.com/ofri-peretz/eslint/commit/0fed33e88ed0b9f9595d1b36375fd8eec7172d6b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - no-xpath-injection: require the string to reach an XPath evaluator

  `containsDangerousXpath` is a regex sweep over printed source — `//` or `..`
  anywhere in the text qualified. That is true of a build banner
  (`` `// Generated by …` ``), of base64 certificate data (`…Lc//wMA…`) and of any
  relative path. Scanning `redis/ioredis` with the recommended preset reported
  both its version-file generator and its TLS certificate constant as XPath
  injection; the package contains no XPath API at all.

  A constant string has nothing to inject into, so the dangerous-pattern path now
  also requires the literal to reach one of `xpathFunctions` (already an option on
  this rule). The interpolation path is unchanged — building an XPath from
  untrusted input is reportable whether or not the evaluator is in the same file.

- Updated dependencies [[`82aebb4`](https://github.com/ofri-peretz/eslint/commit/82aebb405fb9267c22c3edcf97b74087053bc019)]:
  - @interlace/eslint-devkit@1.13.0

## 3.6.0

### Minor Changes

- [#458](https://github.com/ofri-peretz/eslint/pull/458) [`a9fb6c1`](https://github.com/ofri-peretz/eslint/commit/a9fb6c18ba667e793c4233079ad9f1dd9eda50c0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Drop `no-unchecked-loop-condition` from `recommended` — and from every preset derived from it

  Measured over `express` + `axios` + `sequelize`, the rule fired 39 times and
  **38 of them were bounded loops**:

  | pattern                       | count |
  | ----------------------------- | ----- |
  | `for (const x of collection)` | 24    |
  | `for (i = 0; i < len; i++)`   | 7     |
  | `for (const key in obj)`      | 6     |
  | `for (;;)`                    | 1     |

  The single structurally-unbounded hit (`for (;;)` in axios `trackStream`)
  breaks out on stream end, so it is not a denial-of-service either.

  Iterating a collection is not a CWE-400 finding. The rule cannot distinguish a
  bounded loop from an unbounded one, which is the entire job it exists to do. A
  precise version would flag only `while (true)` / `for (;;)` with no reachable
  exit — that is an unreachable-code correctness check rather than a security
  rule, and core plus `unicorn` already cover it.

  The rule is unchanged, still exported, still documented, and still `error` in
  `strict`. Teams that want to sweep for runaway loops can enable it explicitly
  and triage the output. It is no longer part of what a new consumer gets by
  default.

  **Which presets change.** `recommended-strict` and `owasp-top-10` are derived
  from the same `recommendedRules` object, so this one removal drops the rule from
  all three. Only `strict` still enables it. If you are on `recommended-strict`
  rather than `recommended`, this release changes your output too.

  No rule behaviour changes; this only affects the presets.

### Patch Changes

- [#475](https://github.com/ofri-peretz/eslint/pull/475) [`db73308`](https://github.com/ofri-peretz/eslint/commit/db7330857b4669b4ed325dc561f46f82905c56ba) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Stop reporting on evidence that lives in another file, or on no LDAP evidence at all

  **express-security — `require-helmet`, `require-rate-limiting`.** Both required
  `express()` and the middleware registration to be in the _same file_. Splitting
  setup into `setAppConfigurations(app)` is the normal shape for any non-toy
  Express app, so both reported ToniR7/express-typescript-starter, which registers
  `helmet()` and its rate limiter in `utils/appInitialization.ts` and has both
  packages in `dependencies`.

  They now abstain once the app binding is passed to another function: the
  middleware stack is assembled somewhere the rule cannot see, and "no helmet
  here" says nothing about the application.

  **secure-coding — `no-ldap-injection`.** One branch reported any variable whose
  initializer _printed_ containing `req.`, with no LDAP evidence required. It
  flagged `var header = req.headers[field.toLowerCase()]` in **expressjs/morgan**
  — an HTTP logger with no LDAP anywhere — as CWE-90 at CVSS 9.8. The "looks like
  a filter" guard was satisfied by the parentheses of `toLowerCase()`.

  That branch now requires the file to touch LDAP: an `ldapjs`/`ldapts`/
  `activedirectory`/`passport-ldapauth` import (ESM _or_ `require()`, since LDAP
  code in the wild is largely CommonJS), or a call to one of the LDAP sink methods
  the rule already recognises. The rule's other branches each carry their own
  evidence — an LDAP method call, or a literal that parses as a dangerous filter —
  and are unchanged.

- [#468](https://github.com/ofri-peretz/eslint/pull/468) [`f5a9d0d`](https://github.com/ofri-peretz/eslint/commit/f5a9d0daa384520837dfe619bab9e19cfefec92a) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-sensitive-data-exposure` no longer reports prose that mentions a credential,
  and now catches a concatenated credential in a log call.

  The rule flagged any string containing the _word_ password/token/secret, so
  ordinary messages were findings — ten across the 13-repo wild corpus, including
  `throw new Error('Token not found')` and a message quoting a password policy
  back to the user, which is the opposite of a leak.

  A standalone string literal must now carry a value (`password: hunter2`,
  `api_key=abc123`) rather than name a concept. The identifier path deliberately
  keeps the plain word match: a variable named `password` is sensitive because of
  what it holds.

  The same change closes a pre-existing false negative. The logging path handled
  `Literal` and `Identifier` arguments but not a concatenation of the two, so
  `console.log('password: ' + password)` — the case this rule most exists for —
  was silent.

  10 → 0 false positives on the wild corpus, with a real detection added.

- [#468](https://github.com/ofri-peretz/eslint/pull/468) [`f5a9d0d`](https://github.com/ofri-peretz/eslint/commit/f5a9d0daa384520837dfe619bab9e19cfefec92a) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-weak-password-recovery` no longer calls a token predictable without
  evidence.

  The rule reported whenever a recovery-named variable's initializer did not
  _textually contain_ one of four hardcoded generator names, so any project-local
  helper was weak by default:

  ```js
  const forgotPassword = catchAsync(async (req, res) => { ... });  // a route handler
  const resetPasswordToken = generateToken(user.id, expires, RESET); // may wrap crypto
  ```

  The first is not a token at all; the second cannot be judged without seeing
  inside it. Predictability must now be shown — `Math.random()`, `Date.now()`,
  `new Date().getTime()`, time-based `uuid.v1()` — and initializers taking a
  function argument (middleware wrappers) are skipped.

  12 → 5 findings on the 13-repo wild corpus, with weak sources still reported.

- [#468](https://github.com/ofri-peretz/eslint/pull/468) [`f5a9d0d`](https://github.com/ofri-peretz/eslint/commit/f5a9d0daa384520837dfe619bab9e19cfefec92a) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unlimited-resource-allocation` no longer reports passport-jwt as a ZIP bomb.

  The decompression branch matched the callee's printed text for the bare
  substring `Extract` and then reported unconditionally, so the standard
  passport configuration —

  ```js
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken();
  ```

  — was reported as an unbounded decompression in four separate repositories.
  Nine findings on the 13-repo wild corpus, none of them touching an archive.

  Decompression is now matched on the AST: the receiver must resolve to a known
  archive module (`unzipper`, `tar`, `yauzl`, `adm-zip`, `zlib`) through its
  import or `require` binding, and the method must be one of its decompression
  entry points. Aliased bindings such as `const unzip = require('unzipper')`
  still report; an identifier that merely reads like one does not.

  9 → 0 on the wild corpus with no true positives lost.

- Updated dependencies [[`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617)]:
  - @interlace/eslint-devkit@1.12.0

## 3.5.0

### Minor Changes

- [#372](https://github.com/ofri-peretz/eslint/pull/372) [`a7520c8`](https://github.com/ofri-peretz/eslint/commit/a7520c89cf30d1895a503dbd3d3097c699ef38aa) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Drop `detect-object-injection` from the `recommended` preset

  Measured over `express` + `axios` + `sequelize`, the rule fired **535 times —
  85% of everything `recommended` reported on those three repos** (632 total).
  528 of the 535 had no taint indicator anywhere on the reported line:

  ```js
  this.dataValues[updatedAtAttrName] = ...       // sequelize
  where[field] = insertValues[field];            // sequelize
  Axios.prototype[method] = generateHTTPMethod(); // axios
  ```

  That is ordinary internal object manipulation, not attacker-controlled key
  access. Without the rule, `recommended` reports 97 findings on the same corpus
  instead of 632.

  This is a design limit rather than a tuning gap. The rule reports every
  computed key that fails to match one of its hand-maintained "safe" heuristics,
  so on real code the default answer is "report". Inverting that — report only
  when the key is reachable from a taint source — is dataflow analysis the rule
  does not perform, and the rule's own fixtures contradict it (`obj[config.key]`
  is asserted as a violation, which is exactly the axios false positive).

  The rule is unchanged, still exported and still documented. Teams that want the
  paranoid sweep can enable it explicitly and triage the output. It is no longer
  handed to consumers as a default, because at this precision it does not protect
  anyone — it teaches them to disable the plugin.

  No rule behaviour changes; this only affects what `recommended` turns on.

### Patch Changes

- [#323](https://github.com/ofri-peretz/eslint/pull/323) [`4d6114d`](https://github.com/ofri-peretz/eslint/commit/4d6114d1db6050518193ac01a4e0ec193e2b2166) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-object-injection`: decide numeric keys by provability, not by variable name.

  The rule treated a key as a safe array index when the identifier was _called_
  `i`, `j`, `k`, `index`, `idx`, `n` or `len`. That both missed real numeric
  indices (`result[dstOffset++]`, `arr[lastIndex]`, `buf[stride * n]`) and would
  have been fooled by a string-valued variable that happened to be named `n`.

  `isNumericKey` now recognises the shapes that are numeric by JS semantics
  regardless of what any identifier holds: `++`/`--` (ToNumeric), unary `-` and
  `~`, `**`, `+` when _both_ operands are themselves provably numeric, and a
  conditional whose arms both are. A numeric key can never be the string
  `__proto__` / `prototype` / `constructor`, so these cannot pollute a prototype.

  Also added: a key built on a string literal prefix (`nodeProperties['node' + i]`)
  is safe, because the result always begins with that prefix and so can never
  equal a dangerous name. Only a _prefix_ counts — a trailing literal (`arr[a + 1]`)
  still reports, since `+` runs through string concatenation and the rule's threat
  model covers unintended-key writes beyond the three prototype names.

  Measured on the ILB-Edge corpus (three.js + webpack + lodash): **1,753 → 1,621
  findings**. Recall is unchanged by construction — every suppressed shape is one
  where the key provably cannot be a dangerous string.

- [#323](https://github.com/ofri-peretz/eslint/pull/323) [`4d6114d`](https://github.com/ofri-peretz/eslint/commit/4d6114d1db6050518193ac01a4e0ec193e2b2166) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `detect-object-injection`: resolve index expressions through scope, and drop the index-name allowlist.

  Three changes, all replacing naming heuristics with facts about the code:

  **Operands resolved through scope.** `values[valueStart + k]` is ordinary index
  arithmetic, but `+` between two identifiers proves nothing on its own. Each
  operand is now resolved to its declaration: if every value the variable ever
  receives is provably numeric, the sum is numeric. Deliberately conservative — a
  parameter, a `for..of` binding, or a single non-numeric assignment anywhere
  leaves the variable unproven and the access still reports, so the analysis can
  only fail to clear a safe access, never clear an unsafe one.

  **A literal on either side of `+` disqualifies the dangerous names.**
  `array[offset + 1]` always ends with `1` and `obj['node' + i]` always begins
  with `node`; neither can equal `__proto__`, `prototype` or `constructor` — the
  rule's own `dangerousProperties`. This is the dominant real form once the
  offset is a function parameter, where the declaration proves nothing. Scoped to
  `dangerousProperties`, so narrowing that option narrows what disqualifies.

  **The index-name allowlist is gone.** Treating a key as safe because it was
  _named_ `i`, `j`, `k`, `index`, `idx`, `n` or `len` was unsound in both
  directions: it silently cleared `function put(o, k) { o[k] = 1 }`, where `k` is
  an untrusted parameter that merely looks like a counter — a false negative — and
  it missed every real index not on the list (`offset`, `lastIndex`, `stride`).
  Scope resolution covers the genuine counters and refuses the parameters.

  `Math.floor(...)` and the other `Math` methods are now recognised as numeric,
  which is how indices are actually computed (`Math.floor(Math.random() * n)`).

  Measured on the ILB-Edge corpus: the index-arithmetic class drops **275 → 55**
  (−80%), total Edge findings **2,759 → 2,539**. The new false-negative lock
  (`o[k]` on a parameter) reports where the old allowlist stayed silent.

- [#407](https://github.com/ofri-peretz/eslint/pull/407) [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

  `context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
  fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
  resolved cleanly and then every rule threw
  `Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
  nothing, because the manifest claimed the version was supported.

  Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
  9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
  changes; this only makes the manifest match what the code can actually run.

- [#457](https://github.com/ofri-peretz/eslint/pull/457) [`742d76f`](https://github.com/ofri-peretz/eslint/commit/742d76f4e8e4658f915b587a24e2e6b61d2e1e89) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-improper-sanitization` no longer reports developer-authored output or code
  that already escapes.

  This rule produced 42 of the 411 findings on the 13-repo wild corpus — its
  largest single contributor — and one of the 16 ILB-CWE-Corpus false positives.

  **Removed the custom-sanitizer check** (8 wild findings, 1 corpus). It reported
  any call to a function whose _name_ contained sanitize/escape/clean when an
  argument's printed text contained `req.`/`body`/`query`/`params`/`input`/`data`
  — so `sanitizeForLog(req.body.username)` was a finding. That is the correct
  code, and the claim "custom sanitizer may be incomplete or bypassable" was made
  about an implementation the check never read. The `dangerousSanitizerUsage`
  messageId is gone with it.

  **Widened the authored-text exemption** (34 wild findings). A literal reaching
  `res.send`/`write`/`json` is exempt when no tainted leaf reaches the sink with
  it, rather than only when it is the direct argument. Now covered: concatenated
  literals, `['<li>', '</li>'].join('\n')`, values passed through a named
  sanitizer (`escapeHtml`, `DOMPurify.sanitize`, `he.encode`), and object
  literals served as JSON.

  The [#441](https://github.com/ofri-peretz/eslint/issues/441) false negatives stay closed — `res.send(req.query.name || '<p>x</p>')`,
  the ternary form, and any tainted operand still report, as do computed callees,
  deeper member chains, and template literals carrying expressions.

- [#441](https://github.com/ofri-peretz/eslint/pull/441) [`60686f9`](https://github.com/ofri-peretz/eslint/commit/60686f91c21c4763df97b577b29e680e3ca037ba) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Stop `no-improper-sanitization` reporting static developer-authored HTML

  A bare string literal reaching `res.send()` / `res.write()` / `res.json()` was
  reported as CWE-116 whenever it contained `<` or `>`, with no requirement of
  interpolation or user input. Express's own `examples/auth/index.js:89` —
  `res.send('… <a href="/logout">logout</a>')` — was one of 188 findings the
  recommended preset produced on Express's reference code ([#398](https://github.com/ofri-peretz/eslint/issues/398)).

  The rule already applied the opposite reasoning on the `innerHTML` path
  ("static developer-authored HTML normally has no taint source"); that
  exemption now covers the response-output sinks too. Dangerous markup
  (`<script>`, inline `on*=` handlers, `javascript:`) still reports even when
  hardcoded, because there the literal is itself the vector.

- [#459](https://github.com/ofri-peretz/eslint/pull/459) [`8b3ce82`](https://github.com/ofri-peretz/eslint/commit/8b3ce82dda83ed9a7623b90e24e1279f3020ea72) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unchecked-loop-condition` no longer infers user input from identifier names.

  Taint was decided by substring-matching identifiers — and the printed text of
  whole expressions — against
  `['req','request','body','query','params','input','data']`, with
  `includes('input')` and `includes('data')` OR-ed in unconditionally. So
  `metadataMap`, `dataSource`, `queryBuilder`, `LoggerRequestIdHeaders` and a
  local `query` object all read as attacker-controlled.

  The guess also propagated: a variable whose initializer _text_ mentioned one of
  those names joined the taint set, so `const found = coll.find(query)` made
  `found` tainted and every later `for (const r of found)` a finding.

  Taint now starts only at a real request object (`req`, `request`, `ctx`,
  `context`, `event`) and spreads by assignment, seeded from the initializer's
  AST rather than its printed text. `req.query` is evidence; `query` is a name.

  28 findings across express, ultimate-backend and ack-nestjs-boilerplate drop to
  1 — a genuine true positive iterating `ctx.headers`. Request-derived loops
  still report, directly and through assignment.

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

- [#422](https://github.com/ofri-peretz/eslint/pull/422) [`41b9903`](https://github.com/ofri-peretz/eslint/commit/41b990349c21b7c71f4183dad22d5e3dccafc3cd) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-xpath-injection` no longer treats every path join as XPath construction.

  The heuristic for "does this string concatenation look like XPath" was
  `includes('/') || includes('[')`, which matches every path join, URL build and
  array index in existence. Measured on the Interlace monorepo, it reported
  CWE-643 on:

  ```js
  return fullPath.replace(baseDir + '/', '');
  ```

  XPath has syntax of its own, so the gate now requires some of it: the descendant
  axis (`//`), an attribute predicate (`[@id=`), an explicit axis (`child::`), the
  node tests and functions (`text()`, `node()`, `contains(`, `starts-with(`,
  `local-name(`, `position()`), or a location step carrying a predicate (`/user[`)
  — the form that has no `//`.

  Verified in both directions: path joins, URL builds and array-index strings go
  silent, while `"//user[name='" + input + "']"`, `"/root[@id='" + input + "']"`
  and `"/root/user[" + input + "]"` all still report.

  Known limitation, unchanged and now documented in the source: the
  variable-declaration path still matches on the name `path`, so
  `let path = template;` reports. Dropping that keyword was tried and reverted —
  it also stopped `let searchPath = userInput;` firing, and by name alone the two
  are indistinguishable. Separating them needs the declaration's use to reach an
  XPath sink, which is the data-flow analysis these rules avoid.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 3.4.4

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

## 3.4.3

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

- [#390](https://github.com/ofri-peretz/eslint/pull/390) [`56c9273`](https://github.com/ofri-peretz/eslint/commit/56c92731c5c695c08d5730a0c61b3fc8c870f1aa) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `dangerousChars` Options row, which rendered as truncated code

  `no-improper-sanitization` documents `dangerousChars`, and that option's
  default list contains a backtick among the characters it expects a sanitizer to handle. The
  generated Options table wrapped the value in a single backtick, so CommonMark
  closed the inline code span at the one inside the array and the rest of the row
  rendered as unstyled plain text.

  Code cells are now fenced with a run of backticks longer than any run inside
  the value, padded with spaces so a leading or trailing backtick still belongs
  to the value rather than to the fence.

  Documentation only — no rule behaviour changed.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 3.4.2

### Patch Changes

- [#365](https://github.com/ofri-peretz/eslint/pull/365) [`e9bc812`](https://github.com/ofri-peretz/eslint/commit/e9bc81237baf53ecf4bfa47ec8d2d701b1649ca7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Stop `no-insecure-comparison` mangling `== null` under `--fix`

  The rule offered the `==` → `===` rewrite as an auto-applied `fix`, so
  `eslint --fix` rewrote this:

  ```js
  if (body == null) return 0; // matches null AND undefined
  ```

  into this:

  ```js
  if (body === null) return 0; // no longer matches undefined
  ```

  `undefined == null` is `true`; `undefined === null` is `false`. The fix
  changed runtime behaviour and introduced bugs in consumer code. It is now a
  suggestion rather than an auto-applied fix — the rewrite is not guaranteed to
  preserve behaviour when the operands differ in type, not only for null.

  Separately, `x == null` / `x != null` is no longer reported at all. It is the
  idiomatic nullish check, deliberately matching both null and undefined, which
  is why core `eqeqeq` exempts it under `smart` / `allow-null`. Reporting it as
  CWE-697 was a false positive — and one carrying CVSS and SOC2/PCI-DSS
  metadata.

  Measured over `express`, `axios` and `sequelize`: 73 of the rule's 161 reports
  were this pattern. After the change the same corpus yields 8 reports, all
  genuine type-mismatched loose equality.

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 3.4.1

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

## 3.4.0

### Minor Changes

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

## 3.3.4

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 3.3.3

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 3.3.2

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 3.3.1

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

## 3.3.0

### Minor Changes

- [#170](https://github.com/ofri-peretz/eslint/pull/170) [`4cbf3ed`](https://github.com/ofri-peretz/eslint/commit/4cbf3ed8aed113f6aed7cef3a2ed060601b927ce) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `recommended-strict` preset + quick-start in README

  **New preset: `configs['recommended-strict']`**
  Same 16-rule set as `recommended` but every rule promoted to `'error'`.
  For teams that want CI to block on all security findings, not just
  critical ones. The recommended preset stays unchanged.

  ```js
  // eslint.config.mjs
  import securePlugin from 'eslint-plugin-secure-coding';
  export default [...securePlugin.configs['recommended-strict']];
  ```

  **README: copy-paste quick-start block**
  Added a one-line usage example immediately after `npm install` so adopters
  don't have to discover the preset table buried further down the page.
  Also added cross-plugin discovery links to `node-security`, `jwt`, and
  `express-security` for teams that want broader coverage.

### Patch Changes

- [#137](https://github.com/ofri-peretz/eslint/pull/137) [`a56da52`](https://github.com/ofri-peretz/eslint/commit/a56da525d90d233310c5329fdd006af5b3fd675c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(detect-object-injection): suppress ~3,470 Edge false positives via four new safe-pattern guards
  - Test-file skip: rule is now silent on `*.test.*`, `*.spec.*`, `__tests__/`, and `*.fixture.*` paths
  - `for...in` loop variable: keys from `for (const key in obj)` are own property names, not user input
  - `Object.keys/entries` iteration: `for (const key of Object.keys(obj))` is safe by construction
  - Typed-array objects (`new Float32Array/Uint8Array/Int32Array/…`): element access is numeric, not string-keyed

  None of the guards widen the TP surface — dangerous properties (`__proto__`, `constructor`, `prototype`) and genuine user-input bracket access still fire. Closes the largest single source of ILB-Wild noise.

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

## 3.2.0 (Unreleased)

### Added

- New `./oxlint` sub-export for use with [oxlint](https://oxc.rs/docs/guide/usage/linter)'s JS plugin API. Wire it via `{ "jsPlugins": ["eslint-plugin-secure-coding/oxlint"] }` in `.oxlintrc.json`. Exposes the same rule set as the main entry; rules degrade gracefully when type information is unavailable (oxlint's JS plugin context does not provide `parserServices`). The default ESLint entry (`./`) is unchanged.

## 3.1.3 — 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## 3.1.1 — 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## 3.1.0 — 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## 3.0.3 — 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## 3.0.2 — 2025-12-20

### Performance

- **detect-object-injection**: Replaced `getText()` + regex with AST-based validation (~4x faster)
- **detect-non-literal-fs-filename**: Replaced `getText()` + regex with AST-based validation
- **no-timing-attack**: Set-based O(1) lookups for sensitive variables and auth patterns
- **no-buffer-overread**: Set-based O(1) lookups for buffer methods and user-controlled keywords
- **no-missing-csrf-protection**: Set-based O(1) lookups for protected HTTP methods
- **detect-child-process**: Set-based O(1) lookups for dangerous child_process methods

## 3.0.1 — 2025-12-20

### Fixed444

- **detect-object-injection**: Reduced false positives by detecting validation patterns:
  - `includes()` checks in enclosing if-blocks
  - `hasOwnProperty()` / `Object.hasOwn()` / `in` operator checks
  - Preceding guard clauses with early exit (`if (!valid) throw`)
  - Numeric index access (`items[0]`, `items[1]`) now recognized as safe
- **detect-non-literal-fs-filename**: Allow safe path patterns:
  - `path.join(__dirname, ...literals)` with all literal arguments
  - Paths validated with `startsWith()` checks (both inside if-blocks and after guard clauses)
- **no-timing-attack**: Skip false positives in timing-safe contexts:
  - Length comparisons before `crypto.timingSafeEqual()`
  - Early returns inside functions using `timingSafeEqual`
  - Fixed file-level sensitive variable detection to be function-scoped
- **no-unsanitized-html**: Track sanitized variables:
  - Variables assigned from `DOMPurify.sanitize()` now recognized as safe
- **no-unlimited-resource-allocation**: Allow safe static paths:
  - `fs.readFileSync(path.join(__dirname, ...literals))` patterns now recognized as safe

## 3.0.0 — 2025-12-14

### Added

- **OWASP Mobile Top 10 Coverage**: Added 40 new rules targeting mobile security risks (M1-M10).
- **New Presets**:
  - `owasp-mobile-top-10`: Comprehensive mobile security ruleset.
- **Documentation**:
  - Full "Mobile Security" table in README with CVSS scores and fixable icons.
  - Updated `AGENTS.md` with complete rule catalog for AI assistants.

### Changed

- **Recommended Config**: Now includes critical mobile security rules for hybrid web/mobile apps.
- **Rule Improvements**: Refined AST detection for `no-clickjacking` and `no-unvalidated-deeplinks` to reduce false positives.

## 1.0.0 — 2025-01-01

### Added

- Initial release with 48 security-focused ESLint rules
- LLM-optimized error messages with [CWE](https://cwe.mitre.org/) references and [OWASP](https://owasp.org/Top10/) mapping
- Three preset configurations: `recommended`, `strict`, `owasp-top-10`
- Full ESLint 9 flat config support
- TypeScript support

### Security Rules

#### Injection Prevention (11 rules)

- `no-sql-injection` - SQL injection prevention
- `database-injection` - Comprehensive SQL/NoSQL/ORM injection
- `detect-eval-with-expression` - Dynamic eval() detection
- `detect-child-process` - Command injection detection
- `no-unsafe-dynamic-require` - Dynamic require() prevention
- `no-graphql-injection` - GraphQL injection prevention
- `no-xxe-injection` - XXE injection prevention
- `no-xpath-injection` - XPath injection prevention
- `no-ldap-injection` - LDAP injection prevention
- `no-directive-injection` - Template injection prevention
- `no-format-string-injection` - Format string injection prevention

#### Path & File Security (3 rules)

- `detect-non-literal-fs-filename` - Path traversal detection
- `no-zip-slip` - Zip slip vulnerability prevention
- `no-toctou-vulnerability` - TOCTOU race condition detection

#### Regex Security (3 rules)

- `detect-non-literal-regexp` - ReDoS detection in RegExp
- `no-redos-vulnerable-regex` - ReDoS pattern detection
- `no-unsafe-regex-construction` - Unsafe regex prevention

#### Object & Prototype (2 rules)

- `detect-object-injection` - Prototype pollution detection
- `no-unsafe-deserialization` - Unsafe deserialization prevention

#### Cryptography (6 rules)

- `no-hardcoded-credentials` - Hardcoded secrets detection
- `no-weak-crypto` - Weak algorithm detection
- `no-insufficient-random` - Weak randomness detection
- `no-timing-attack` - Timing attack prevention
- `no-insecure-comparison` - Insecure comparison detection
- `no-insecure-jwt` - JWT security issues detection

#### Input Validation & XSS (5 rules)

- `no-unvalidated-user-input` - Input validation enforcement
- `no-unsanitized-html` - XSS via innerHTML prevention
- `no-unescaped-url-parameter` - URL parameter XSS prevention
- `no-improper-sanitization` - Output encoding enforcement
- `no-improper-type-validation` - Type confusion prevention

#### Authentication & Authorization (3 rules)

- `no-missing-authentication` - Auth check enforcement
- `no-privilege-escalation` - Privilege escalation detection
- `no-weak-password-recovery` - Secure password reset enforcement

#### Session & Cookies (3 rules)

- `no-insecure-cookie-settings` - Cookie security enforcement
- `no-missing-csrf-protection` - CSRF protection enforcement
- `no-document-cookie` - Direct cookie access detection

#### Network & Headers (5 rules)

- `no-missing-cors-check` - CORS validation enforcement
- `no-missing-security-headers` - Security header enforcement
- `no-insecure-redirects` - Open redirect prevention
- `no-unencrypted-transmission` - HTTPS enforcement
- `no-clickjacking` - Clickjacking prevention

#### Data Exposure (2 rules)

- `no-exposed-sensitive-data` - Data exposure prevention
- `no-sensitive-data-exposure` - Log sanitization enforcement

#### Buffer & Memory (1 rule)

- `no-buffer-overread` - Buffer safety enforcement

#### DoS & Resource (2 rules)

- `no-unlimited-resource-allocation` - Resource limit enforcement
- `no-unchecked-loop-condition` - Infinite loop prevention

#### Platform-Specific (2 rules)

- `no-electron-security-issues` - Electron security enforcement
- `no-insufficient-postmessage-validation` - postMessage validation
