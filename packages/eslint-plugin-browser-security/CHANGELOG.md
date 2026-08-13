## [1.2.3] - 2026-02-08

## 1.3.1

### Patch Changes

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-credentials-in-query-params` no longer reports templates that merely contain
  the text `token=`.

  ```js
  outputDebug(
    `Loaded session for ${store}: token=${maskToken(session.accessToken)}`,
  );
  ```

  That is a debug log, not a URL, and the value is explicitly **masked** — wrong
  on both counts. Two causes:

  - The `TemplateLiteral` branch read `sourceCode.getText(node)`, which returns
    the template's own **source**, interpolations included. The characters of
    `${maskToken(session.accessToken)}` were part of the text being matched. The
    repo's standing rule is to match the AST, never printed source.
  - It required no `?` or `&` prefix, while the `Literal` branch did. That
    asymmetry was the bug: a literal needed `?token=`, a template matched a bare
    `token=` anywhere — including the `: token=` of a log line.

  Both branches now use the same test, over the static quasi text only, with each
  interpolation replaced by a placeholder so `?` and `token=` cannot be joined
  across a boundary.

  Measured on the 8-repo corpus: **11 findings → 1**, and that one is a genuine
  true positive (`okta/okta-signin-widget` `RouterUtil.js:34` puts a real token in
  a query string).

  `?stateToken=` is no longer matched by `?token=` — a longer parameter that ends
  in a sensitive name is a different parameter.

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-innerhtml` no longer treats every `.write()` call as a DOM XSS sink.

  ```js
  process.stdout.write(`Preview URL: ${previewUrl}`); // was reported as XSS
  socket.write(payload); // likewise
  res.write(chunk); // likewise
  ```

  `write` and `writeln` are DOM sinks only on a **document**. The method name
  alone is one of the most overloaded in JavaScript — `process.stdout`, `stderr`,
  sockets, HTTP responses, streams and buffers all have it — and matching on the
  name turned every CLI progress message into a cross-site-scripting finding.

  The rule's own comment said it was covering `document.write(...)`; the
  implementation never checked the receiver.

  Measured on the 8-repo corpus: **73 findings → 11**, and all 11 survivors are
  genuine DOM sinks (`el.innerHTML = …`, `outerHTML`, `insertAdjacentHTML`). 23
  of the removed findings were `Shopify/cli` writing to stdout.

  `document.write`, `window.document.write`, `iframe.contentDocument.write`,
  `el.ownerDocument.write` and the conventional `doc.write` all still report.
  `insertAdjacentHTML` keeps no receiver gate — nothing outside the DOM is
  called that.

- [#546](https://github.com/ofri-peretz/eslint/pull/546) [`bbc9845`](https://github.com/ofri-peretz/eslint/commit/bbc9845f2244732c4163835b87fd62d75557b879) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-http-urls` and `detect-mixed-content` no longer report XML namespace URIs
  or loopback origins.

  ```jsx
  <svg xmlns="http://www.w3.org/2000/svg" />; // was reported by BOTH rules
  const base = 'http://localhost:3000'; // was reported as mixed content
  ```

  **Namespace URIs are identifiers, not requests.** `http://www.w3.org/2000/svg`
  is compared byte-for-byte by the XML parser and never dereferenced, so it
  carries no transport risk — and "fixing" it to `https://` **breaks the
  document**, because the string no longer matches the namespace. That makes this
  worse than noise: the advice was actively harmful.

  It was also the single largest false-positive shape in the corpus — 29
  occurrences in `okta/okta-signin-widget` alone, reported by _both_ rules, so 58
  findings from one misunderstanding. Recognised two ways, either sufficient: a
  registered namespace-authority host, or an `xmlns` / `xmlns:*` attribute or
  property name whatever the host.

  **Loopback is a secure context.** Per the Secure Contexts spec a loopback
  origin is _potentially trustworthy_, so no browser blocks or flags
  `http://localhost:3000` from an HTTPS page. Calling it mixed content described
  behaviour that does not happen; every corpus hit was webpack dev-server or
  end-to-end fixture config. `no-http-urls` already had `allowedHosts` defaulting
  to localhost — `detect-mixed-content` had no options at all and now shares the
  same understanding.

  Measured on the 8-repo corpus:

  | Rule                   | Before | After |
  | ---------------------- | -----: | ----: |
  | `no-http-urls`         |     45 | **8** |
  | `detect-mixed-content` |     49 | **2** |

  The allowlist is by **host**, not substring: `http://cdn.example.com/w3.org/x.js`
  is still a real request and still reports, as does `http://localhost.evil.com`.

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

## 1.3.0

### Minor Changes

- [#409](https://github.com/ofri-peretz/eslint/pull/409) [`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Stop the source-specific sink rules double-reporting with the generic ones, and
  make each one actually check its own source.

  Measured on the shipped tarball, with `browser-security/recommended` and nothing
  else enabled, every source shape reported more than once at the **identical
  range**:

  | code                        | rules that fired                                                          |
  | --------------------------- | ------------------------------------------------------------------------- |
  | WebSocket → `innerHTML`     | `no-innerhtml` + `no-websocket-innerhtml`                                 |
  | WebSocket → `eval`          | `no-eval` + `no-websocket-eval`                                           |
  | `postMessage` → `innerHTML` | `no-innerhtml` + `no-postmessage-innerhtml` + `no-websocket-innerhtml`    |
  | FileReader → `innerHTML`    | `no-innerhtml` + `no-filereader-innerhtml`                                |
  | Worker → `innerHTML`        | `no-innerhtml` + `no-websocket-innerhtml` + `no-worker-message-innerhtml` |

  Two separate defects produced that table. The source rules gated on the _handler
  shape_ — `X.onmessage = fn` — and never on what `X` was, so they fired alongside
  the generic rule on the same value, and `no-websocket-innerhtml` fired on
  `postMessage` and Worker handlers too: a finding that said "WebSocket message
  data" and linked the WebSocket MDN page for code containing no WebSocket.

  New `@interlace/eslint-devkit` export `createPayloadResolver` resolves a
  handler's receiver back to its construction (`new WebSocket` / `new Worker` /
  `new SharedWorker` / `new FileReader`, plus the global receivers for
  `postMessage`). The ownership rule it enforces: **a source rule reports only what
  it can positively attribute; the generic rule reports everything else.** The two
  tests are complements, so exactly one rule reports any given value.

  An unresolvable receiver now falls to `no-innerhtml` / `no-eval` rather than
  being reported as a WebSocket. Nothing goes unreported — the finding moves rules,
  and its message stops claiming a provenance it cannot prove.

### Patch Changes

- [#427](https://github.com/ofri-peretz/eslint/pull/427) [`7d819f2`](https://github.com/ofri-peretz/eslint/commit/7d819f22b8c3e3f0457227eeea76eadc71fbb48e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-clickjacking` no longer reports frame-busting as frame manipulation.

  The rule flagged its own recommended remediation. `requireFrameBusting` asks you
  to write a frame-buster; writing one then reported `frameManipulation`:

  ```js
  if (top != self) {
    top.location = self.location; // ← reported as clickjacking
  }
  ```

  The assignment is detected as manipulation with no check for the guard that
  encloses it. It now walks the AST for an enclosing `if` whose test compares two
  frame references (`top`, `self`, `parent`, `window.top`, `window.self`) and
  treats the assignment inside as the remediation it is.

  The old frame-busting detector matched printed source against fixed strings like
  `'top != self'`, so `top !=  self` and `top!==self` — the same program — did not
  match, and a comment containing the phrase did. That check is now structural;
  see the ratchet in `scripts/audit-gettext-classification.ts`.

  Naked redirects still report: `top.location = 'https://evil.test'`, and the same
  assignment gated on an unrelated flag or a call result rather than a frame
  comparison.

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

- [#416](https://github.com/ofri-peretz/eslint/pull/416) [`fc69481`](https://github.com/ofri-peretz/eslint/commit/fc69481d690fc2b7f36f41acd025c0bda4f25fe7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unencrypted-transmission` no longer flags protocol strings that are being
  inspected, or XML namespace identifiers.

  The rule reported **every** string literal containing `http://`, regardless of
  what the code did with it. Two false-positive classes followed, both measured by
  running the published ruleset over the Interlace monorepo:

  **The security check reported as the vulnerability.** The rule's own finding
  landed on this line:

  ```js
  // Skip external links, anchors, and absolute paths
  if (url.startsWith('http://') || url.startsWith('https://') || …)
  ```

  A protocol string passed to `startsWith` / `includes` / `match`, passed as the
  **first** argument to `replace` / `replaceAll`, or compared with `===`, is the
  thing being _looked for_ — not an endpoint being called. The second argument to
  `replace` / `replaceAll` is content being written, so
  `url.replace(p, 'http://evil.test')` still reports.

  **XML namespaces.** `xmlns="http://www.w3.org/2000/svg"` is the most common
  `http://` string in any React codebase — every inline SVG carries one. It is
  never fetched; namespaces are opaque identifiers and rewriting one to `https`
  breaks the document. Also covers the XSD/XSL/RDF and Inkscape/Adobe namespaces.

  Both are locked as `valid` cases, verified by reverting each guard and watching
  the rule report again. True positives are unaffected: `fetch('http://api…')`,
  `new WebSocket('ws://…')` and connection strings still report.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 1.2.14

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

## 1.2.13

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

## 1.2.12

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 1.2.11

### Patch Changes

- [#359](https://github.com/ofri-peretz/eslint/pull/359) [`b2e887b`](https://github.com/ofri-peretz/eslint/commit/b2e887bb5dec8eff3d2907e4422e382abaac99d5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Document the options the rules actually accept

  Ten option names appeared in rule docs but not in the rules' schemas. Because
  every schema sets `additionalProperties: false`, copying one out of the docs
  did not fail quietly — it aborted the whole lint run:

  ```
  Key "rules": Key "vercel-ai-security/no-hardcoded-api-keys":
    Value {"keyPatterns":[...]} should NOT have additional properties.
    Unexpected property "keyPatterns". Expected properties: "apiKeyPatterns".
  ```

  Six of the seven affected tables were fictional end to end — not one
  documented option existed. Affected rules: `no-hardcoded-api-keys`,
  `no-unsafe-output-handling`, `require-abort-signal`, `require-max-steps`,
  `require-max-tokens`, `require-tool-schema` and
  `browser-security/no-sensitive-localstorage`.

  Three "Mitigation: configure X" notes pointed at knobs that are hardcoded and
  were never configurable; they now say so instead of promising a fix that
  cannot be applied.

  No rule behaviour changes — this is documentation catching up to the schemas.

- Updated dependencies [[`e8e9ee6`](https://github.com/ofri-peretz/eslint/commit/e8e9ee6d521bac301d0554e54ec22afbe8f49e98)]:
  - @interlace/eslint-devkit@1.7.0

## 1.2.10

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

## 1.2.9

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

## 1.2.8

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.2.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.2.6

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.2.5

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

## 1.2.4

### Patch Changes

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [1.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-browser-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-browser-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### XSS Prevention Rules (2)

- `no-innerhtml` - Detect dangerous innerHTML/outerHTML assignments (CWE-79)
- `no-eval` - Detect eval(), new Function(), and string-based callbacks (CWE-95)

#### postMessage Security Rules (3)

- `require-postmessage-origin-check` - Require origin validation in message handlers (CWE-346)
- `no-postmessage-wildcard-origin` - Prevent wildcard targetOrigin in postMessage (CWE-346)
- `no-postmessage-innerhtml` - Prevent XSS via innerHTML in postMessage handlers (CWE-79)

#### Storage Security Rules (4)

- `no-sensitive-localstorage` - Prevent storing sensitive data in localStorage (CWE-922)
- `no-sensitive-sessionstorage` - Prevent storing sensitive data in sessionStorage (CWE-922)
- `no-sensitive-indexeddb` - Prevent storing sensitive data in IndexedDB (CWE-922)
- `no-jwt-in-storage` - Prevent storing JWT tokens in browser storage (CWE-922)

#### Cookie Security Rules (3)

- `no-sensitive-cookie-js` - Prevent storing sensitive data in cookies via JavaScript (CWE-1004)
- `no-cookie-auth-tokens` - Prevent auth tokens in JS-accessible cookies (CWE-1004)
- `require-cookie-secure-attrs` - Require Secure and SameSite cookie attributes (CWE-614)

#### WebSocket Security Rules (3)

- `require-websocket-wss` - Require secure WebSocket connections (wss://) (CWE-319)
- `no-websocket-innerhtml` - Prevent XSS via innerHTML in WebSocket handlers (CWE-79)
- `no-websocket-eval` - Prevent RCE via eval() in WebSocket handlers (CWE-95)

#### File API & Workers Security Rules (4)

- `no-filereader-innerhtml` - Prevent XSS via innerHTML with FileReader data (CWE-79)
- `require-blob-url-revocation` - Require revoking Blob URLs to prevent memory leaks (CWE-401)
- `no-dynamic-service-worker-url` - Prevent dynamic URLs in service worker registration (CWE-829)
- `no-worker-message-innerhtml` - Prevent XSS via innerHTML in Worker message handlers (CWE-79)

#### CSP Security Rules (2)

- `no-unsafe-inline-csp` - Disallow 'unsafe-inline' in CSP (CWE-79)
- `no-unsafe-eval-csp` - Disallow 'unsafe-eval' in CSP (CWE-95)

#### Presets (7)

- `recommended` - Balanced security defaults
- `strict` - All 21 rules as errors
- `xss` - XSS-focused rules only
- `storage` - Storage security rules only
- `postmessage` - postMessage security rules only
- `websocket` - WebSocket security rules only
- `cookies` - Cookie security rules only

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment
- TypeScript support with exported option types
- Comprehensive test coverage (297 tests, 97.73% line coverage)
- Auto-fix suggestions where safe

### Security

- Covers 8 CWEs: 79, 95, 319, 346, 401, 614, 829, 922, 1004
- Maps to OWASP Top 10 2021: A01, A02, A03
