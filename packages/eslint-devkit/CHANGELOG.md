# @interlace/eslint-devkit

All notable changes to `@interlace/eslint-devkit` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 1.17.1

### Patch Changes

- **🐛 Fix** — Test-file detection now recognises compound directory names. ([#671](https://github.com/ofri-peretz/eslint/pull/671))

  The shared predicate matched exact segments — `test`, `tests`, `spec`, `e2e` —
  and missed the compound names large repositories actually use.
  sentry-javascript keeps its entire suite under `dev-packages/e2e-tests/`,
  `dev-packages/node-integration-tests/` and
  `dev-packages/browser-integration-tests/`, none of which matched.

  A directory segment ending in `-test`, `-tests`, `-spec` or `-specs` is now
  treated as test material. The hyphen is required, so `latest` and `manifest`
  stay production code.

  `require-https-only` and `no-exposed-debug-endpoints` additionally opt out of
  test files entirely. Both judge runtime posture — where bytes go, and what a
  server is configured to expose — and a test application's posture never ships.
  Rules that already expose their own `allowInTests` option were deliberately left
  alone: skipping ahead of them would override a user's explicit
  `allowInTests: false`.

  Measured across four large public repositories, together with the `no-http-urls`
  fix in this release: 671 findings before, 164 after. sentry-javascript alone
  went from 248 to 43.

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

## 1.17.0

### Minor Changes

- [#610](https://github.com/ofri-peretz/eslint/pull/610) [`3854526`](https://github.com/ofri-peretz/eslint/commit/38545268c6028267787a1cb7c0a7e065babad99c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Accessibility rules cite WCAG, not CWE.

  Every rule in this plugin declared `cwe: 'CWE-252'`. CWE-252 is "Unchecked
  Return Value" — a security weakness about ignoring what a function returns.
  It has nothing to do with a missing `alt` attribute, and CWE has no
  accessibility entries at all, because it is a taxonomy of _security_
  weaknesses.

  The claim was not cosmetic. `formatLLMMessage` enriches from the CWE, so a
  developer with an image missing alt text was shown:

  ```
  ♿ CWE-252 OWASP:A10-Mishandling CVSS:5.3 | Image missing alt text | CRITICAL
  ```

  Four assertions, all false, and two of them contradicting each other in the
  same line — CVSS 5.3 is the MEDIUM band while the label reads CRITICAL. A
  third disagreed with `meta.docs.cvss`, which said 9.5. That string reaches the
  docs site, SARIF output and any consumer's security dashboard.

  Now:

  ```
  ♿ WCAG 1.1.1 | Image missing alt text | HIGH
  ```

  All **37** rules now declare a criterion, up from the 21 that carried the bad
  CWE. The extra 16 had no standards metadata at all while their docs named one —
  found by the reverse half of the lock, which is the half that catches stale
  metadata. Each criterion comes from that rule's own `docs/rules/*.md`, which
  named the right standard the whole time — the machine-readable metadata simply
  disagreed with the prose beside it. A lock now keeps the two in step, in both
  directions.

  `CRITICAL` is gone from this plugin. It belongs to the security severity
  vocabulary, where it means stop shipping; a WCAG Level A failure is serious and
  `HIGH` says so without borrowing a word that means something else.

  `@interlace/eslint-devkit` gains `wcag` on `meta.docs` and on the message
  options, rendered in the standards prefix where CWE would go. No behaviour
  changes for rules that do not set it.

- [#609](https://github.com/ofri-peretz/eslint/pull/609) [`a22fd9b`](https://github.com/ofri-peretz/eslint/commit/a22fd9b7755f3988739f9d67a7c209b77836612a) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `identical-functions` stops reporting on code nobody edits.

  On the pinned 8-repository corpus the rule produced **3,707** findings. Two
  classes accounted for nine tenths of them, both correct detections of real
  duplication and neither actionable — which under the effective-FP standard
  costs the rule exactly what a wrong finding would.

  **Test files (52.9%).** `ignoreTestFiles` already defaulted to `true`, but its
  predicate was `/\.(test|spec)\.[jt]sx?$/` — a _basename_ test. okta-auth-js
  keeps its whole suite under `test/spec/**` with plain names
  (`test/spec/TokenManager/browser.ts`), so the option did nothing there. It now
  uses the devkit's shared `isTestFilePath`, which decides the directory case by
  exact path **segment** — never `filename.includes('test')`, which would make a
  verdict depend on where the repo is checked out.

  A repeated `it()` block is not a maintenance defect. The repetition _is_ the
  test: each case restates its setup so it reads independently when it fails.

  **Generated files (35.6%).** New `ignoreGeneratedFiles` option, default `true`.
  twilio-node's `src/rest/**` is emitted by OpenAPI Generator; every resource
  gets the same `fetch`, `remove` and `page`. You cannot DRY it, and the next
  generator run rewrites it wholesale.

  Decided by the file's **own declaration** — an `@generated` docblock or a
  "this code was generated by" banner in the leading comments — not by whether
  the path contains the word. `src/generated-reports/summary.ts` is a name, and
  still reports. The banner must be a header: a generation phrase below the first
  statement does not silence the module.

  Result: **3,707 → 371**. Every one of the 507 silenced files carries a banner,
  and all of them are in the one repository that ships generated code; the other
  seven repositories lost nothing. twilio-node keeps 15 findings, in its
  hand-written `src/base`, `src/jwt` and `examples`.

  Both skips are options. Setting either to `false` restores the findings, and a
  test pins that in each direction.

  `@interlace/eslint-devkit` exports `isGeneratedFile` for rules that give
  maintainability advice. Security rules must not use it: generated code ships
  and runs, so an injection in it is live whoever typed it.

  ***

  `cognitive-complexity` and `max-parameters` skip generated files too.

  `createRule` gains an opt-in `skipGeneratedFiles`, the counterpart to the
  existing `skipTestFiles`. The two are not symmetric: `skipTestFiles` stays off
  for these rules on purpose, because a convoluted test is still a readability
  cost to whoever debugs it. Generated code has no such reader.

  Measured on the pinned corpus, then applied:

  | rule                   | before |      after |
  | ---------------------- | -----: | ---------: |
  | `cognitive-complexity` |  1,409 | 965 (−32%) |
  | `max-parameters`       |    407 | 296 (−27%) |

  The predicted shares were 32% and 27%, so the predicate silenced the generated
  set and nothing else.

- [#640](https://github.com/ofri-peretz/eslint/pull/640) [`6f9124e`](https://github.com/ofri-peretz/eslint/commit/6f9124e5e29a7cf7c5e0dde3127bcf219c1538d7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-magic-numbers` stops reading machine-packed output.

  8 minified bundles carried **2,446 of this rule's 10,129 findings** on the
  pinned corpus, and one of them — `assets/speedscope/import.bcbb2033.js` — was
  1,973 by itself. "Name this constant" is advice to whoever edits the file, and
  nobody edits a bundle.

  Corpus: **10,129 → 7,532.**

  `@interlace/eslint-devkit` gains `isMinifiedFile` and a `skipMinifiedFiles`
  flag on `createRule`, joining `skipTestFiles` and `skipGeneratedFiles`.

  **Decided from the file's own shape, never its path.** `dist/`, `.min.js` and
  `vendor/` are conventions a stranger's repository is free to ignore, and the
  largest offender announces nothing in its name.

  **Average line length, not maximum** — and that distinction is the whole
  predicate. 13 corpus files had a line over 1,000 characters and only 8 were
  minified; the rest were ordinary source with one long line, including SVG icon
  components whose `d` attribute is a single 1,600-character path. Skipping those
  would have been silent recall loss in application code.

  |                     |  average line |
  | ------------------- | ------------: |
  | minified bundles    | 712 – 203,807 |
  | hand-written source |       32 – 58 |

  A 2 KB floor sits under the average, because a short file can exceed it without
  being packed — a one-line barrel re-export is not a bundle.

  Security rules must not set this: a bundle ships and runs, and a minified
  bundle is exactly where a supply-chain problem would hide.

### Patch Changes

- [#633](https://github.com/ofri-peretz/eslint/pull/633) [`16bae7b`](https://github.com/ofri-peretz/eslint/commit/16bae7ba0451ed19757231be60b8ed88abb35d9e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `corpus-scan` can install its targets, and `no-extraneous-dependencies` was
  never unmeasurable.

  **The exclusion was wrong.** `no-extraneous-dependencies` compares imports
  against `package.json`, not against the installed tree. It reports the same 10
  findings on auth0/express-openid-connect before and after an install. It was
  excluded by association with `no-unresolved`, and **1,067 findings** were
  invisible to the gate for no reason. It is budgeted now.

  The exclusion was argued at length in a doc comment, and the argument was still
  wrong. An exclusion needs the same evidence as a budget — "it is about
  dependencies" is a name, not a measurement.

  **New `--install-targets` flag.** Installs each target's dependencies before
  scanning, with `--ignore-scripts` — not optional, and test-pinned. These are
  eight third-party repositories pinned by SHA; a lifecycle script in any of them
  would run with the privileges of whoever runs the scan, and nothing here needs
  a build to run. All 8 install in 5.3 minutes and 5 GB, so the flag is opt-in
  rather than default.

  Measured: `no-unresolved` **8,904 → 5,585**. The 3,319 removed were bare
  specifiers. The 5,585 remaining are dominated by 4,451 relative imports in
  Shopify/cli of files graphql-codegen writes at _build_ time — an install cannot
  reach those, so that half stays excluded, honestly: in a fresh checkout the
  file really is absent.

  **Measurability is decided by the targets, not by the flag.** `node_modules`
  survives in the shared cache, so a run without the flag would otherwise resolve
  everything while claiming it could not. `--update` refuses outright when the
  flag and the actual state disagree, which caught a budget of
  `no-unresolved: 2630` being written into a file CI evaluates against bare
  clones.

  `react-features/hooks-exhaustive-deps` ratchets 91 → 84.

- [#612](https://github.com/ofri-peretz/eslint/pull/612) [`5e0e029`](https://github.com/ofri-peretz/eslint/commit/5e0e029acc7ad5877c915d56bea5f4f707983fe6) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `corpus-scan --local` now actually measures the local working tree.

  Three layers of staleness, each hiding the next:

  1. **The devkit came from npm.** Every plugin declares
     `@interlace/eslint-devkit` as a semver _range_, so npm resolved it from the
     registry and the rig ran local plugins against the **published** devkit.
     Everything living there — `isTestFilePath`, `createRule`'s skip flags, every
     shared detector — was measured at whatever was last released, while the
     report said "LOCAL WORKING TREE".

  2. **The fingerprint did not cover it.** `distHash` ran over the plugins only,
     so a devkit-only change left the rig stamped unchanged.

  3. **npm's cache served the old tarball.** `--install-links` packs each `file:`
     dependency under `name@version`, and a rebuild does not bump the version.
     The rig now uses a private cache directory, dropped whenever the fingerprint
     changes.

  This surfaced loudly — `isGeneratedFile is not a function`, on 8 of 8 targets —
  only because the change added a _new_ export. A change to an existing one is
  silent: the scan runs, produces a number, and the number describes code that is
  not in the tree.

  It explains a measurement that had been recorded as unexplained.
  `react-features/hooks-exhaustive-deps` read 84 on some runs and 91 on others,
  and plugin staleness, npm cache and filesystem case-sensitivity had each been
  ruled out. Against a correctly local rig it reads **84**. The 91 was the
  published devkit.

- [#611](https://github.com/ofri-peretz/eslint/pull/611) [`d81469f`](https://github.com/ofri-peretz/eslint/commit/d81469fa2921043b44b1f042e23cb9148ae72c04) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-cycle` cites CWE-1047, and CWE-407 gets its real name back.

  `CWE_MAPPING` carried **CWE-407** under the name "Circular Dependencies".
  CWE-407 is **"Inefficient Algorithmic Complexity"** — quadratic blowup, a hash
  table degrading to a list, a regex that backtracks. `import-next/no-cycle` was
  pointed at it on the strength of that name.

  The correct identifier is **CWE-1047, "Modules with Circular Dependencies"**,
  which sits in the Software Development view as a quality weakness. It was
  already referenced by `no-relative-packages` and was **not in the table at
  all**, so that rule silently received no enrichment.

  `no-cycle` also rendered a line that argued with itself:

  ```
  🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | CRITICAL
  ```

  CVSS 5.3 is the MEDIUM band, and `meta.docs.cvss` said 9.5 — the band reserved
  for remote code execution, for a circular import. Now all three agree:

  ```
  🏗️ CWE-1047 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | MEDIUM
  ```

  New gate `npm run lint:severity-consistency`. Across the built plugins, 432
  messages render both a CVSS score and a severity label and **165 of them —
  38.2% — disagree**. Which value is right is a per-rule judgment, so the gate
  does not pick: it records the existing set and fails on a new one, or on a
  registry entry whose rule no longer disagrees.

## 1.16.1

### Patch Changes

- [#574](https://github.com/ofri-peretz/eslint/pull/574) [`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `looksCatastrophic` no longer backtracks polynomially on its own input.

  The helper that decides whether a user-supplied rule option is safe to compile
  ran three probes against that same untrusted string. Two of them —
  `(pattern)[^()]*[+*}][^()]*` and its alternation twin — are 2nd-degree
  polynomial by `recheck`, which is the oracle `no-redos-vulnerable-regex`
  consults, and our own rule reported both. A ReDoS detector that is itself a
  ReDoS is the fault this code exists to police.

  Excluding the delimiter from each leading character class anchors the match on
  its first occurrence, which removes the ambiguity. The language is unchanged —
  verified differentially over 400,000 inputs with zero disagreements — so no
  pattern changes verdict. `recheck` now calls all three probes safe, and the
  guarantee is pinned by a test that reads the source, so a probe added later is
  checked automatically rather than escaping silently.

## 1.16.0

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

## 1.15.0

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

## 1.14.0

### Minor Changes

- [#548](https://github.com/ofri-peretz/eslint/pull/548) [`d86a8d8`](https://github.com/ofri-peretz/eslint/commit/d86a8d8de3e6fa4c404192365a7aa66c9646233d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - The shared SDK gate now recognises every way a module can be brought into a
  file, not just `import` and a bare `require()`.

  ```js
  import OpenAI = require('openai');        // gate stayed shut
  const { OpenAI } = await import('openai'); // gate stayed shut
  ```

  `createModuleListEvidence` routes the flat `modules` lists that the SDK rule
  factories already take through `createModuleEvidence`, which understands
  import-equals, dynamic import, re-exports, Deno specifiers and `require`
  shadowing. Before this, four plugins — `anthropic-security`,
  `gemini-security`, `mcp-sdk-security` and `openai-security` — ran **no rule at
  all** on a file that loaded its SDK either of those two ways. The gate was
  never wrong about the library; it was wrong about the spelling.

  The same pass narrowed three shared factories to report evidence rather than
  resemblance: `sdk-api-key-rule` now names the property that actually held the
  credential instead of guessing the first configured one,
  `browser-escape-hatch-rule` and `system-prompt-injection-rule` check the
  receiver, and `sql-injection-rule` requires the driver import.

  `matchesModule` is **deprecated but still exported**. It only answers "which
  package is this string in?" and cannot see how the module was loaded — prefer
  `createModuleListEvidence`. It is kept so this stays a minor release: dropping
  it would strand every plugin on its `^1` range, which is the opposite of
  shipping these fixes.

## 1.13.0

### Minor Changes

- [#502](https://github.com/ofri-peretz/eslint/pull/502) [`82aebb4`](https://github.com/ofri-peretz/eslint/commit/82aebb405fb9267c22c3edcf97b74087053bc019) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Share one SDK-evidence probe, and gate the last plugin that had none

  `createModuleEvidence` moves the probe into the devkit. Five plugins each
  carried their own copy, so the two false-negative classes the audit found —
  TypeScript's `import =` form and Deno's `npm:` / `deno.land` specifiers — had to
  be fixed five times. One implementation now carries package-root matching,
  rejection of relative specifiers, both dynamic forms, lexically-scoped `require`
  shadowing, an optional non-import evidence arm, and a per-`Program` cache.

  `nestjs-security` is gated on it. Measured over 107,382 files across 107
  repositories, **22% of everything it reported (219 of 999 findings) was in a
  file importing no NestJS package** — its rules key on decorator and method names
  that Angular, TypeORM and plain TypeScript classes share. This is a **major**:
  any rule may now stay silent where it previously reported.

  Every other SDK plugin already abstained, but eight of them proved it only
  inside a devkit factory. They now ship a registry-wide lock as well, so the
  guarantee survives a hand-written rule added tomorrow.

## 1.12.0

### Minor Changes

- [#478](https://github.com/ofri-peretz/eslint/pull/478) [`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Each SQL plugin now reports only in files that import its own driver

  `createSqlInjectionRule` discriminated on **method name alone**. That is not an
  SDK: `.query()` is TypeORM _and_ mysql2 _and_ pg; `.raw()` is knex _and_ drizzle
  with byte-identical config; and sqlite claimed `get`, `all`, `run` and `exec`,
  which belong to Express routers and `Promise.all` as much as to a database.

  Measured over 73,364 files, that produced **1,142 lines where two or more
  plugins reported the same CWE** — 616 postgres×typeorm, 503 mysql×typeorm, 503
  mysql×postgres, 347 drizzle×knex. One defect, billed up to three times.

  The factory now takes a `modules` list and stays silent in files importing none
  of them, compared on the package root so `mysql2/promise` and
  `@prisma/client/edge` still match. Relative specifiers never count — otherwise
  `'./knex'` would satisfy the knex rule in a repo with no knex.

  This makes the collision impossible by construction rather than deduplicated
  after the fact, and it is local evidence: no project scan, nothing to go stale,
  and a file that does not import the driver is one the rule has nothing to say
  about.

  Every fixture across the seven suites now carries its driver's import, so the
  suites still exercise the detection logic instead of passing on the new gate.

## 1.11.0

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

## 1.10.0

### Minor Changes

- [#406](https://github.com/ofri-peretz/eslint/pull/406) [`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - New rule `no-untrusted-content-in-prompt` (CWE-1427) on all three raw inference
  SDKs, from a shared `createSystemPromptInjectionRule` factory.

  A system prompt is instruction text: whatever is spliced into it is read by the
  model as instructions rather than as data, so anyone who controls that value
  controls the agent. The rule reports a system prompt that is not static, in both
  shapes the raw SDKs use — the named option (`system`, `instructions`,
  `systemInstruction`) and the `messages: [{ role: 'system', content }]` array.

  A bare identifier counts as static. `system: SYSTEM_PROMPT` is the correct
  pattern and by far the most common one; following it is the data-flow analysis
  these rules avoid.

  **`strict` only.** Unlike the credential rules, this one has a genuine
  false-positive shape — a system prompt interpolating today's date is not an
  injection and the rule cannot tell the difference. Promotion to `recommended`
  waits on the corpus measurement.

  Gating is by qualified member path (`messages.create`, `completions.create`,
  `generateContent`), not by leaf method name. `create` alone is shared across
  these SDKs, and matching on it made a file importing two of them report one line
  twice. `vercel-ai-security/no-dynamic-system-prompt` keeps the bare-function
  `generateText(...)` form, which has no member path at all — verified by linting
  a file that imports all four SDKs and uses every shape: no line is reported
  twice.

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

## 1.9.0

### Minor Changes

- [#403](https://github.com/ofri-peretz/eslint/pull/403) [`6f5f164`](https://github.com/ofri-peretz/eslint/commit/6f5f164c7461d66f17689039d19fa9d7d84111ef) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-browser-api-key-exposure` now covers the Anthropic SDK too.

  The rule shipped on `eslint-plugin-openai-security` only. Its detection moved
  into a shared `createBrowserEscapeHatchRule` factory in
  `@interlace/eslint-devkit`, and `eslint-plugin-anthropic-security` gains the
  rule at `error` in every preset.

  Both SDKs refuse to run in a browser by default and both unlock it with the
  same `dangerouslyAllowBrowser` flag; the Anthropic SDK's own JSDoc says
  client-side use "risks exposing your secret API credentials to attackers".

  **Two instantiations, not three.** Verified against the published tarballs
  rather than assumed: neither `@google/generative-ai@0.24` nor
  `@google/genai@2.15` has a browser escape hatch, because neither refuses the
  browser in the first place. There is no flag to detect and no structural signal
  a linter can read without knowing whether a file ships to a client, so
  `eslint-plugin-gemini-security` does not get this rule. Inventing a fuzzy third
  detection would report correct code.

  OpenAI's behaviour and its reported messages are unchanged; only the
  implementation moved.

- [#402](https://github.com/ofri-peretz/eslint/pull/402) [`5980f89`](https://github.com/ofri-peretz/eslint/commit/5980f89a65113e43d504ecc72a86d61aa1e522cb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-hardcoded-api-key` now covers all three raw inference SDKs.

  The rule shipped on `eslint-plugin-anthropic-security` only. Its detection moved
  into a shared `createSdkApiKeyRule` factory in `@interlace/eslint-devkit` and is
  now instantiated for OpenAI and Gemini as well, at the same severity in every
  preset — one rule with three module gates rather than three separate ones that
  could drift.

  Gemini adds a shape the other two do not have: the legacy
  `new GoogleGenerativeAI(apiKey)` client takes the key as a **positional**
  argument, with no options object to inspect. Both that and the current
  `new GoogleGenAI({ apiKey })` form are checked.

  Module matching is exact-or-subpath, not a prefix: `openai` opens the gate for
  `openai` and `openai/resources`, and deliberately not for `openai-edge`, which
  is a different package with a different client.

  Anthropic's behaviour and its reported messages are unchanged; only the
  implementation moved.

- [#386](https://github.com/ofri-peretz/eslint/pull/386) [`81acd9c`](https://github.com/ofri-peretz/eslint/commit/81acd9ca270940529b455fbfa685b842b8cfe982) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-hardcoded-credentials` (CWE-798) to the knex, mysql, Sequelize and
  TypeORM plugins, via a new shared `createHardcodedCredentialsRule` factory.

  A password in source is a password in git history, in every fork, and in every
  layer of the built image. Deleting the line later changes nothing — a real fix
  means rotating the credential _and_ rewriting history, so the only cheap moment
  is before it lands.

  The detection generalizes what `eslint-plugin-postgresql-security` has shipped
  for pg, and tightens two false positives in the process:

  - A connection URL is a finding only when it embeds a password. The pg version
    reports any `postgres://…` literal, including `postgres://localhost:5432/app`,
    which is safe to commit.
  - A credential key is a finding only when its value is a non-empty string
    literal, so `password: ''` (the local trust-auth sentinel) stays silent.

  It also refuses to treat the credential as its own evidence: an object must name
  somewhere to connect _to_ — `host`, `port`, `database`, `connectionString` —
  before its `password` counts. Without that, `{ user, password }` makes the login
  form of every app with a database a finding.

- [#389](https://github.com/ofri-peretz/eslint/pull/389) [`8e238ea`](https://github.com/ofri-peretz/eslint/commit/8e238ea3a7f18aa47c6d02368c6023d8575deca4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-mass-assignment` (CWE-915) to the five ORM plugins with object writes,
  via a new shared `createMassAssignmentRule` factory.

  ```ts
  await prisma.user.update({ where: { id }, data: req.body });
  await User.create(req.body);
  await db.insert(users).values({ ...req.body });
  ```

  Each of those updates the fields the endpoint is about — and every other column
  on the model: `role`, `isAdmin`, `ownerId`, `emailVerified`, `credits`. None of
  them appear in the diff, which is why the shape survives review.

  It also gets worse without anyone touching it: adding a sensitive column to a
  model later silently widens every existing mass-assignment site. No line
  changes, and the exposure is new.

  Silent by design: a payload that names its fields (`{ name: req.body.name }`) is
  the fix; an object that merely has a `body` key (`form.body`) is not a request;
  `ctx.data` is ordinary application state in several frameworks; and a value the
  rule cannot see through is not guessed at.

  No options, deliberately. An allowlist would let a project re-approve the
  dangerous shape wholesale, one config file further from the call site.

  mysql2 and better-sqlite3 do not carry this rule — their writes are raw SQL
  strings, already covered by `no-unsafe-query`.

- [#385](https://github.com/ofri-peretz/eslint/pull/385) [`0cbcc46`](https://github.com/ofri-peretz/eslint/commit/0cbcc46f89258c888de7354cf24b90c316df43b0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-raw-identifier-interpolation` (CWE-89) to the Drizzle and Prisma plugins.

  Bind parameters can only ever substitute _values_. When a table name, a column
  name, or a sort direction is interpolated into a tagged template, the driver has
  nothing to bind and splices the string in verbatim — inside the API the docs
  call safe:

  ```ts
  await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`; // parameterized
  await prisma.$queryRaw`SELECT * FROM ${table}`; // injectable
  await db.execute(sql`SELECT * FROM users ORDER BY ${column}`); // injectable
  ```

  This is the shape behind Drizzle's GHSA-gpj5-g38j-94v9, and it is invisible to
  linters that decide by asking "is this a raw API" — this _is_ the safe API.

  The rule reports only identifier positions, so it never overlaps
  `no-unsafe-query`, whose sinks are the raw string entry points
  (`$queryRawUnsafe`, `sql.raw()`). Value holes, string literals,
  `sql.identifier()` and nested `sql` fragments are all silent. Only Drizzle and
  Prisma ship a value-parameterizing tagged template, so the other five ORM
  plugins do not carry this rule.

  New shared factory `createRawIdentifierRule` in `@interlace/eslint-devkit`.

## 1.8.0

### Minor Changes

- [#373](https://github.com/ofri-peretz/eslint/pull/373) [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `require-tls` (CWE-319) to the Knex, mysql2, Sequelize and TypeORM security plugins.

  Reports two distinct failures, because they do not share a remediation:

  - **`tlsDisabled`** — the connection is plaintext (`ssl: false`, `?sslmode=disable`).
    Every query, every row and the credentials that open the session cross the
    network in the clear.
  - **`certificateValidationDisabled`** — `rejectUnauthorized: false` (or
    `trustServerCertificate: true` on mssql, which inverts the polarity). The
    traffic is encrypted but the server is never authenticated, so the client
    completes a handshake just as willingly with whoever answered in the
    database's place. The fix is to supply the CA, never to switch the check off.

  The detection gate is a _database connection config_ — driver import plus a
  connection-shaped sibling key — which is what keeps the rule out of
  `eslint-plugin-node-security`, where a bare `rejectUnauthorized: false` would
  also match every https agent and fetch option in the repo, and double-report
  this line from two plugins.

  A value the rule cannot read statically (`ssl: useTls`) is never reported. That
  is a deliberate false negative in exchange for findings that are always real.

  Not shipped for `prisma-security` (connection config lives in `schema.prisma`,
  not JavaScript), `drizzle-security` (delegates connection setup to the
  underlying driver, which its own plugin covers) or `sqlite-security` (a local
  file, no network to protect).

- [#391](https://github.com/ofri-peretz/eslint/pull/391) [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unsafe-query` now follows same-file query helpers

  The rule only ever treated a literal driver method call as a sink. Real
  codebases do not call `client.query` at every call site — they wrap it once:

  ```ts
  const q = (sql: string, params: unknown[]) => pool.query(sql, params);

  q(`SELECT * FROM users WHERE id = ${userInput}`, []); // was silent
  q('SELECT * FROM users WHERE id = ' + userInput, []); // was silent
  ```

  Both of those are textbook CWE-89 and both went unreported — not because the
  helper was hard to reach, but because the callee was named `q` instead of
  `query`. The helper being in the _same file_, three lines above, made no
  difference. Any project that wraps its driver once, which is most of them, was
  getting no SQL injection coverage at all from this rule.

  A function whose parameter is handed straight to a driver sink is now itself a
  sink at that argument position, and calls to it are checked like the driver call
  they stand for. `function` declarations, arrow functions in a `const`, class
  methods and object-literal methods are all traced, including when the helper is
  declared below its call site. Concatenation, interpolation, and a
  previously-tainted variable passed to the helper all report.

  Findings through a helper require the string to contain SQL keywords, even for
  instances configured with `requireSqlKeywords: false` (`eslint-plugin-pg`).
  "This identifier eventually reaches a sink" is weaker evidence than a literal
  driver call, and without the gate a file that defined any helper over
  `pool.query` would start reporting unrelated calls like ``log(`hello ${name}`)``.
  A bare `query(...)` with no member access is likewise never treated as a driver
  sink — only as a possible helper.

  Parameterized calls through a helper stay silent, which is what
  [#261](https://github.com/ofri-peretz/eslint/issues/261) asked for:
  ``q(`SELECT * FROM users WHERE id = $1`, [id])`` interpolates nothing and is
  safe at any distance.

  Helpers imported from another module are still not traced — that needs type
  information the rule does not request. This is documented as a known false
  negative rather than silently missing.

  Affects `no-unsafe-query` in all eight SQL plugins: `pg`, `mysql-security`,
  `prisma-security`, `drizzle-security`, `knex-security`, `sqlite-security`,
  `typeorm-security` and `sequelize-security`.

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

- [#379](https://github.com/ofri-peretz/eslint/pull/379) [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unsafe-query` now reports CWE-89 on the template-literal path, not just the concatenation path

  `createSqlInjectionRule` builds two findings for the same vulnerability and picks
  between them on shape: `noUnsafeQuery` for concatenation, `unsafeTemplateLiteral`
  for an interpolated template. Only the first carried standards metadata, so a
  finding like this

  ```js
  db.query(`SELECT * FROM users WHERE id = ${userInput}`);
  ```

  was emitted with no CWE, no OWASP category and no compliance tags — while the
  equivalent `'...' + userInput` reported `CWE-89 OWASP:A03 CVSS:9.8`. Anything
  grouping findings by CWE (SARIF consumers, security dashboards, our own corpus
  scoring) therefore counted only half of every SQL injection rule, and the half it
  missed is the idiomatic modern way to write the bug.

  Both messages now take their CWE from the same `meta.docs.cwe` the rule
  documents. This affects the `no-unsafe-query` rule in all eight SQL plugins:
  `pg`, `mysql-security`, `prisma-security`, `drizzle-security`, `knex-security`,
  `sqlite-security`, `typeorm-security` and `sequelize-security`.

  Detection behaviour is unchanged — the same code reports in the same places, with
  the same severity. Only the emitted message text gains the standards tokens.

## 1.7.0

### Minor Changes

- [#353](https://github.com/ofri-peretz/eslint/pull/353) [`e8e9ee6`](https://github.com/ofri-peretz/eslint/commit/e8e9ee6d521bac301d0554e54ec22afbe8f49e98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-unscoped-mutation` (CWE-284) to the Prisma, Drizzle and Knex plugins

  Every ORM ships a bulk mutation whose _unscoped_ form rewrites or deletes the
  whole table. `prisma.user.deleteMany()`, `db.delete(users)`, `knex('users').del()`
  — each one type-checks, passes review, and only shows up once it has run against
  production data. `eslint-plugin-drizzle`'s entire published surface is this single
  check for a single ORM; this generalizes it.

  The detection lives in one place, `createUnscopedMutationRule` in
  `@interlace/eslint-devkit`, and each plugin instantiates it with its own sinks and
  remediation copy — the same shape `createSqlInjectionRule` already uses. Each
  plugin declares where its scope lives: an options-object filter for Prisma, a
  chained `.where*()` for Drizzle and Knex.

  Every instantiation is gated on the driver: the rule is silent in files that
  never import it, and silent on receivers that do not read as a driver handle.
  Without that gate, `delete` and `update` would match `map.delete(key)` and
  `store.update(patch)` — method names alone are not discriminators.

  | Plugin             | Sinks                      | Where scope comes from             |
  | :----------------- | :------------------------- | :--------------------------------- |
  | `prisma-security`  | `deleteMany`, `updateMany` | `{ where }` in the options object  |
  | `drizzle-security` | `delete`, `update`         | a chained `.where()`               |
  | `knex-security`    | `del`, `delete`, `update`  | any of the chained `where*` family |

  `argumentRole` is the one thing that cannot be inferred from the AST. A lone
  identifier argument is the _filter_ for Prisma (`deleteMany(opts)`) and the _table_
  for Drizzle (`db.delete(users)`); reading it wrong either suppresses the headline
  Drizzle finding or invents a false positive on every dynamically built filter.

  **Not shipped for Sequelize or TypeORM.** Sequelize gives its instance and static
  forms the same names and both accept an options object, so
  `user.destroy({ transaction: t })` (one row) and `User.destroy({})` (the whole
  table) are the same AST. Two false positives surfaced in its test suite, and the
  rule was withdrawn from that package rather than shipped with them — a rule that
  fires on correct code is the one users disable. The genuinely detectable case,
  `destroy({ truncate: true })`, becomes its own rule. TypeORM's bare-criteria shape
  (`repo.delete({ id })`, with no `where` key) is a third detection shape and is
  deferred for the same reason.

  Scope that cannot be read statically is treated as present, so the rule stays
  silent rather than guessing. Ships in `strict` only — promotion to `recommended`
  and `flagship` waits on a measured false-positive profile against the benchmark
  corpus.

## 1.6.2

### Patch Changes

- [#341](https://github.com/ofri-peretz/eslint/pull/341) [`a8f5e13`](https://github.com/ofri-peretz/eslint/commit/a8f5e13f3e0ae01ff99d6ca0882dfc624e305d9d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix "Cannot find module '@typescript-eslint/utils'" on a clean install — every
  published plugin was failing to load.

  `rule-creation/sql-injection-rule.ts` imported `AST_NODE_TYPES` from
  `@typescript-eslint/utils`. That is an **enum — a runtime value**, so the built
  output emitted `require("@typescript-eslint/utils")`. But the devkit declares
  that package as an `optional` peer dependency, which npm does not install. The
  result: any project doing `npm i -D eslint-plugin-<any>` got a package that threw
  on `require`.

  Reproduced from nothing:

  ```
  npm i -D eslint eslint-plugin-mongodb-security
  node -e "require('eslint-plugin-mongodb-security')"
  → Error: Cannot find module '@typescript-eslint/utils'
  ```

  Verified on `nestjs-security`, `secure-coding`, `node-security` and `jwt` too —
  **all four failed identically**, so this affected the whole published ecosystem.

  The fix keeps the zero-dependency goal intact: `AST_NODE_TYPES` now comes from the
  local `../ast-node-types` shim that exists for exactly this reason, and
  `TSESLint` / `TSESTree` become `import type`, which is erased at compile time.
  No dependency added, no artifact-size regression.

  A lock test asserts the built output contains no runtime `require` of
  `@typescript-eslint/utils`, so this cannot regress silently again.

## 1.6.1

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

## 1.6.0

### Minor Changes

- [#334](https://github.com/ofri-peretz/eslint/pull/334) [`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Zero runtime dependencies: install 7500 kB → 444 kB, load 242 ms → 13.6 ms

  `@interlace/eslint-devkit` is the infrastructure package every plugin in this
  ecosystem depends on, so its dependency tree was every plugin's dependency
  tree — 2 dependencies pulling 22 packages, 5.42 MB as reported by
  packagephobia, and 433 modules evaluated on every `require`.

  It now declares **no dependencies at all**. A bare install is one package;
  the tarball is 65.9 kB packed; a cold `require` of the barrel loads 29
  modules in 13.6 ms instead of 433 in 242 ms — roughly a quarter-second off
  every ESLint process start, per plugin.

  End to end, on the same fixture and min-of-10 warm: **ESLint 288 → 216 ms
  (−25%)** and **oxlint 320 → 145 ms (−55%)**. oxlint benefits because it loads
  these plugins through the JS-plugin shims in `tools/oxlint-plugins/`; against
  its 68 ms pure-Rust floor, the JS-plugin overhead fell **252 → 77 ms (−69%)**.

  The compiled output only ever made five external `require()` calls. Four were
  avoidable:

  - **`typescript` (24 MB)** — imported only for `ts.TypeFlags` bitflag
    constants in `type-utils.ts`. Those values are now inlined, and `typescript`
    is an optional peer. `src/types/type-flags.test.ts` asserts the inlined
    table against the real compiler so it cannot silently drift.
  - **`@typescript-eslint/utils` (~4.5 MB with its tree)** — used at runtime
    only for `ESLintUtils.RuleCreator` and `AST_NODE_TYPES`. `RuleCreator` is
    ported in-tree with its full generic signature;
    `src/rule-creation/rule-creator.parity.test.ts` diffs the port against
    upstream on every run. Crucially, `utils` declares a _non-optional_
    `typescript` peer — dropping it as a hard dependency is what actually
    releases the 24 MB above.
  - **`@typescript-eslint/types` (144 KB)** — 168 self-mapped strings behind a
    144 KB package. `AST_NODE_TYPES` is now inlined in `src/ast-node-types.ts`
    (12 KB), cast to the upstream enum type so the _exported type is unchanged_:
    a plain `as const` object would break consumers, because TypeScript rejects
    a string literal where a string-enum member is expected.
    `src/ast-node-types.test.ts` compares the table to the real enum in both
    directions, so an upstream addition or rename fails the build instead of
    silently shipping a node type our rules can never match.
  - **`oxc-resolver` (~1.5 MB native binary)** — exactly one plugin
    (`eslint-plugin-import-next`) resolves imports, but all 21 consumers
    downloaded the binary. It is now an optional peer, loaded lazily on first
    use rather than at module load; `eslint-plugin-import-next` declares it
    directly. A missing binary raises `MissingResolverPeerError` with install
    instructions rather than being swallowed into "this import doesn't resolve".

  Type-only imports from `@typescript-eslint/utils` remain and cost nothing at
  runtime, so the public type surface is unchanged. No exported symbol was
  removed or retyped; `turbo build` across all 22 workspace packages, 43/43 test
  tasks, and the oxlint-parity benchmark (100%) all pass unchanged, and a
  packed plugin lints correctly in a project with no `@typescript-eslint`
  scope, no `typescript`, and no `oxc-resolver` installed.

  Two further reductions were measured and rejected as bad trades: lazy-loading
  the resolver and ARIA subtrees (~8 ms of the 13.6 ms load, but it moves cost
  onto `eslint-plugin-import-next`'s per-import hot path), and dropping `tslib`
  via `importHelpers: false` (+8 KB of emitted JS to shed a peer every plugin
  declares anyway).

  **Every package also stops shipping dead bytes** — 1.5 MB across the
  ecosystem, 5539.4 kB → 3546 kB unpacked (−36.0%), with no consumer-visible
  change. `scripts/build-package.ts` owns all five exclusions:

  - **Source maps** (322 kB, 93 files). `tsconfig.base.json` sets
    `sourceMap: true` and only eslint-devkit opted out. Every published map was
    dead on arrival: `.npmignore` strips `*.ts`, so each pointed at a source
    file absent from the tarball. They are now deleted outright rather than
    filtered at pack time — a map is only useful beside the source it maps to,
    and the comment-strip pass below rewrites the `.js` anyway, so a retained
    map would be stale as well as unpublishable.
  - **`AGENTS.md`** (48 kB, 12 packages). Contributor docs — "context for AI
    coding agents _working on_ \<pkg\>", with monorepo-root install steps and
    `nx` commands this repo no longer uses.
  - **JSDoc in emitted `.js`** (571 kB, 17% of all shipped JavaScript). Nobody
    reads comments in `node_modules/**/dist/*.js`; the `.d.ts` comments, which
    editors _do_ surface on hover, are untouched. `removeComments` can't just be
    switched on — it strips `.d.ts` docs too (devkit's declarations drop
    98 kB → 31 kB and every hover doc vanishes), and a second in-place pass is
    rejected on composite projects and clobbers the good `.d.ts`. So the build
    re-emits to a scratch dir and copies back only the `.js`. Same compiler,
    same input, output identical apart from comments. Costs ~1.5 s per package
    on a cold build (turbo caches it) and does **not** change load time — V8
    skips comments cheaply (measured 16.15 → 16.01 ms); this is a size win only. Per-file MIT headers go
    with the comments; `LICENSE` still ships at every package root.

  - **Generated declarations for the plugins** (595 kB). A plugin is consumed by
    ESLint at runtime, not imported as a typed library, but tsc still inlined
    every inferred rule-option type into the entry declaration —
    `eslint-plugin-import-next` shipped a 166 kB `index.d.ts`. They can't just
    be deleted: a TypeScript flat config does
    `import plugin from 'eslint-plugin-foo'`, which is TS7016 with no
    declaration (verified). So the entry declarations are replaced by a ~350-byte
    hand-written one typing the plugin object shape — all a config file touches.
    `src/types/**` is preserved verbatim, because 14 plugins expose it as a
    public `./types` subpath that consumers really do import. Only
    `eslint-plugin-*` is pruned; `@interlace/eslint-devkit` is a real library
    whose declarations are the product.

  - **`CHANGELOG.md`** (225 kB, 6% of everything shipped). The one component
    that grows with every release forever, so its share only rises. npm does not
    render it on the package page — the history stays on GitHub, in npm's
    "Versions" tab, and in the changesets release notes. `README.md` is kept: it
    IS the npm package page.

  `scripts/check-published-artifacts.ts` (new, wired into `pre-push`,
  `npm run quality`, and the release workflow's pre-publish stage) fails the
  build if any of these comes back, and also locks the discoverability metadata
  npm search and quality scorers read. It runs on the exact artifact the release
  job publishes — locally, any `tsc --build` over the solution (e.g.
  `npm run typecheck`) re-emits into `dist/` and undoes the post-processing; a
  rebuild restores it, and the gate catches it either way.

  `scripts/check-artifact-size.ts` (new) reports per-package size against a
  committed baseline (`.agent/artifact-size-baseline.json`). It is **advisory —
  it never blocks**, because bundles legitimately grow and a hard cap would just
  get raised until it meant nothing. The point is that growth becomes a noticed
  decision rather than a surprise found later on npm. `--update` refreshes the
  baseline; `--strict` exits non-zero for a deliberate audit.

  Every before/after pair above was measured on the SAME codebase — `origin/main`
  at 8172db04 built in one worktree, this branch in another — min-of-10 warm runs
  on Node 24. Earlier figures in this changeset came from a stale branch and were
  restated on 2026-08-03.

  **Migration.** With npm 7+ these are auto-installed as peers where a real
  dependency exists, so most consumers need no change. If you use a strict
  package manager (pnpm without hoisting, or `--legacy-peer-deps`) and hit a
  missing module, install it explicitly:

  - type-aware rules → `typescript`
  - `eslint-plugin-import-next` → `oxc-resolver` (now declared for you)

  Marked `minor`, not `major`. The API is unchanged — no exported symbol was
  removed or retyped — and with npm 7+ the three ex-dependencies are auto-installed
  as peers wherever a real dependency exists. The honest caveat: a strict package
  manager (pnpm without hoisting, or `--legacy-peer-deps`) will now need them
  declared explicitly, which is the one respect in which this is a bigger change
  than the version implies. Dependents pin `^1.4.4`, which already satisfies
  1.5.0, so consumers pick up the slim infrastructure on their next install
  without a range rewrite.

### Patch Changes

- [#328](https://github.com/ofri-peretz/eslint/pull/328) [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eliminate the false-positive storm on real MongoDB/Mongoose codebases.

  A dry run against mikemajesty/nestjs-microservice-boilerplate-api (393★,
  NestJS 11 + Mongoose, 253 files) produced 145 findings under `recommended`,
  138 of which were false positives. Method names alone were doing all the work:
  `find` is also `Array.prototype.find`, `connect` is also a Redis client and a
  TypeORM query runner, and `findOne`/`updateOne` are the vocabulary of every
  generic repository wrapper ever written.

  | Rule                         | Before  | After  |
  | ---------------------------- | ------- | ------ |
  | `no-select-sensitive-fields` | 80      | 0      |
  | `no-unbounded-find`          | 41      | 8      |
  | `no-bypass-middleware`       | 11      | 6      |
  | `require-auth-mechanism`     | 7       | 0      |
  | `require-tls-connection`     | 2       | 0      |
  | **total**                    | **145** | **18** |

  The remaining 18 are all real Mongoose model calls in one repository file.

  New shared `utils/receiver.ts` answers, once per file, whether a call's
  _receiver_ is plausibly MongoDB — a PascalCase model identifier, a
  `model`/`collection`/`db` name, a `db.collection(...)` chain, or a value bound
  to a `mongodb`/`mongoose` import. Connection rules are stricter still:
  `client`/`connection` earn no benefit of the doubt, since they are just as
  likely Redis or Postgres.

  `no-select-sensitive-fields` additionally requires evidence that a sensitive
  field exists before claiming one is exposed — either the query names it
  (`.select('password')`, `{ projection: { password: 1 } }`) or a sensitive
  field name is visible in the file. The new `requireVisibleSensitiveField`
  option (default `true`) restores the old behaviour for codebases whose schemas
  live outside the files that query them.

  `allowInTests` now recognises `test/`, `tests/`, `__tests__/`, `__mocks__/`,
  `e2e/` and `fixtures/` directories, not only a `*.test.ts` suffix — a
  testcontainers helper is not a production connection.

  Every fix ships a regression fixture taken from the real scan alongside a
  true-positive test, so no rule goes inert.

- [#320](https://github.com/ofri-peretz/eslint/pull/320) [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`no-cycle` no longer crashes on deep import chains.** Tarjan's SCC pass recursed once per graph node, so a chain deeper than the JS call stack threw `RangeError: Maximum call stack size exceeded` — and since the rule defaults to unlimited traversal depth, nothing capped the descent. ESLint exited 2 with no results at all: not a slow lint, no lint. Observed at file 4,974 of a 5,000-node chain on Node 24.

  The traversal now runs on an explicit frame stack. Traversal order and every write to the Tarjan state are unchanged, so the components produced are identical; depth is bounded by heap rather than by the call stack. `eslint-plugin-import` has the same defect in its own `lib/scc.js` and still crashes on the same input.

  Chains reach these depths through generated API clients, nested barrel files, and long `export … from` ladders — depth accumulates through re-export edges, which is exactly what the rule follows. Reproduce with `node benchmarks/scripts/repro-deep-chain.mjs 6000`.

## 1.5.0

### Minor Changes

Extract the raw-SQL-injection detector (CWE-89) into
`@interlace/eslint-devkit` as `createSqlInjectionRule`, so every driver plugin
can instantiate it with its own sinks and remediation copy.

Background: scanning OWASP Juice Shop with the recommended presets of
`secure-coding`, `node-security`, `express-security` and `mongodb-security`
produced zero findings on its two flagship SQL injections
(`routes/search.ts`, `routes/login.ts` — both `sequelize.query()` template
literals). The detection was never the problem: `pg/no-unsafe-query` matches
any `.query()` member call and flags both correctly. The problem is
distribution — nobody on Sequelize installs the Postgres plugin.

The factory takes the sink list, a SQL-keyword precision gate, and the
remediation copy, which is everything that actually differs between drivers.
`pg/no-unsafe-query` is now an instantiation of it: same rule id, message
ids, sink and behaviour, and all 28 pre-existing rule tests pass untouched.

Also raises the timeout on the `no-deprecated-plugin-references` guard in
devkit. Both layers shell out to a repo-wide `grep`, which cannot finish
inside vitest's 5s default once the suite has enough test files running in
parallel — it failed as a timeout, not a violation.

Driver-scoped plugins that instantiate the factory ship separately.

## 1.4.4

### Patch Changes

- [#302](https://github.com/ofri-peretz/eslint/pull/302) [`09d2951`](https://github.com/ofri-peretz/eslint/commit/09d2951b3ac74efc9ba49b64e9089d66800b16cc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the Interlace OG banner to the README, so the npm page matches every
  published plugin in the ecosystem. devkit was the only published package
  carrying the closing Interlace mark but no banner. README-only change — no
  runtime, API, or type surface is affected; the release exists to get the
  updated README onto npm, where it is baked in at publish time.

## 1.4.3

### Patch Changes

- [#304](https://github.com/ofri-peretz/eslint/pull/304) [`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - README: call the plugin family "the Interlace eslint-plugins" instead of
  `@interlace/eslint-plugin-*`.

  The plugins publish unscoped — `eslint-plugin-jwt`, not
  `@interlace/eslint-plugin-jwt` — so the scoped form named packages that do not
  exist on npm. This is a docs-only change; no runtime behaviour is affected. It
  ships as a patch so the corrected text reaches the package page on npm.

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

## 1.4.2

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

## 1.4.1

### Patch Changes

- [#155](https://github.com/ofri-peretz/eslint/pull/155) [`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix `patternToRegex` (glob→regex) to escape **all** regex metacharacters, not just `.`. The previous chained `.replace()` left `\ + ( ) | [ ] { } ^ $` to leak through as regex syntax, so an ignore glob such as `a+b` or `(x)` compiled to a quantifier / capture group and matched the wrong files (CWE-116, surfaced by CodeQL `js/incomplete-sanitization`). The wildcard translation (`**`, `*`, `?`) is unchanged; a regression-lock test pins the metacharacter behavior.

### Changed

- Module resolver swapped from `enhanced-resolve` + `get-tsconfig` to [`oxc-resolver`](https://www.npmjs.com/package/oxc-resolver) (Rust NAPI, ~18-30× faster). Per-tsconfig caching for monorepo path-alias correctness across package boundaries.
- `peerDependenciesMeta` no longer lists `enhanced-resolve` and `get-tsconfig` (consumers don't need to peer-provide them; this is **technically breaking** but no consumer impact is expected).

### Added

- `oxc-resolver` is now a hard `dependencies` entry. Note for adopters: NAPI prebuilds cover common targets (Linux x64/arm64 glibc + musl, macOS x64/arm64, Windows x64); rare targets may need to fall back to a build step.

## 1.4.0 — 2026-05-03

## 1.3.3 — 2026-02-08

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

## 1.3.2 — 2026-02-06

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

## 1.0.0 — 2025-11-30

### 🚀 Features

- Enhanced LLM message formatting utilities.
- Improved TypeScript typings for IDE support.

### 🩹 Fixes

- Compatibility fixes for TS strict mode.
- More accurate type guards for AST checking.

### 📌 Notes

- Package name aligned to `@interlace/eslint-devkit` (formerly eslint-plugin-utils).

### ❤️ Thank You

- Ofri Peretz

---

## 0.3.0 — 2025-11-15

### 🚀 Features

- Enhanced type utilities.
- Improved AST helpers.
- Better LLM-oriented error messaging.

### 🩹 Fixes

- Type checking edge cases.
- Documentation improvements.

### ❤️ Thank You

- Ofri Peretz

---

## 0.2.2 — 2025-11-07

### 🩹 Fixes

- Config fixes; removed codecov vite plugin.
- Adjusted ignore patterns in dependency checks.
- Added vitest to peerDependencies.

### ❤️ Thank You

- Ofri Peretz

---

## 0.2.1 — 2025-11-07

### 🩹 Fixes

- Config and dependency-check adjustments.

### ❤️ Thank You

- Ofri Peretz

---

## 0.2.0 — 2025-11-02

Version bump to align packages; no code changes.

---

## 0.1.1 — 2025-11-02

Version bump to align packages; no code changes.

---

## 0.1.0 — 2025-11-02

Initial prerelease for the devkit utilities.
