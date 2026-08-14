# Benchmark methodology — exact configuration

**Companion to** [BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md). Every parameter that affects a
published number lives here, so a result can be reproduced or challenged without reading the
runners.

---

## 1 · Coverage — which numbers come from all 20 repositories

| Number | Coverage |
|---|---|
| Total findings (1,375 us / 23,325 them) | **All 20 repos**, 23,682 files |
| Per-rule finding counts (245, 182, 179 …) | **All 20 repos** |
| Files scanned per repo | **All 20 repos** |
| Throughput, wall-clock | **All 20 repos** |
| **Precision estimate (~45%)** | **Subset.** Samples were capped at one per repo per rule, max 3–4 per rule, and the walk stopped once each rule had its quota. Roughly 13 of 20 repos contributed samples |

**Stated plainly: the volumes are complete, the precision figure is an extrapolation.** It
classifies each rule from a handful of its findings and weights that verdict by the rule's
full volume, covering 1,106 of 1,375 findings (80%). It is not a census of all 1,375.

The 20 repositories, all cloned `--depth 1`:

```
Automattic/mongoose      Unitech/pm2            auth0/node-jsonwebtoken   axios/axios
directus/directus        expressjs/express      fastify/fastify           helmetjs/helmet
knex/knex                louislam/uptime-kuma   motdotla/dotenv           n8n-io/n8n
nestjs/nest              nodemailer/nodemailer  npm/cli                   parse-community/parse-server
sequelize/sequelize      serverless/serverless  strapi/strapi             webpack/webpack
```

---

## 2 · Which rule set each suite enables

**This differs by suite, and it changes what the numbers mean.**

| Suite | Interlace rules | Competitor rules | Why |
|---|---|---|---|
| `ilb-real-source` (20 repos) | **80** — `recommended` only | **14** — `recommended` only | Nobody enables 121 rules in anger. Comparing an all-rules run against their 14-rule recommended would measure the wrong thing |
| `ilb-competitor-parity` (their test suite) | **121** — every rule | n/a | Parity asks "can we detect this at all", so every rule is fair game |
| `head-to-head` (labelled corpus) | **121** — every rule | **14** — every rule | Both sides at full strength |
| `det-all` (7-plugin detection) | **121 + 4 more plugins** | n/a | Measures ecosystem coverage, not the 3-plugin product |
| `ilb-juliet` | per `ilb-arena` configs | per plugin config | Shared config matrix across 6 plugins |

A number quoted from one suite must name the rule set. **The 58-vs-985 finding rate is
`recommended` vs `recommended`.** The 100% parity figure is all-rules.

---

## 3 · ESLint configuration

Identical for both sides in every suite:

```js
{
  files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
}
{ files: ['**/*.{ts,tsx}'], languageOptions: { parser: '@typescript-eslint/parser' } }
```

- **Severity:** every rule at `'error'`. No per-rule severity tuning.
- **Options:** **none passed** — every rule runs on its documented defaults. No `taintSources`,
  no `ignorePatterns`, no `allowLiterals`, nothing.
- **Type-aware linting:** off. No `project` / `projectService`, so rules requiring type
  information run in their untyped mode.
- **ESLint 10.8.1, Node 24.** `overrideConfigFile: true` — the scanned repository's own
  ESLint config is never loaded.

### Exclusions (applied identically to both sides)

```
node_modules  dist  build  .next  .nuxt  coverage  vendor  public
fixtures  __fixtures__  test  tests  __tests__  spec  specs  e2e
benchmark(s)  example(s)  doc(s)
*.min.js  *.bundle.js  *.chunk.js   *.d.ts
any file averaging > 500 chars/line (minified, by content not filename)
```

**Known gap:** these exclude test *directories* but not test-*named files* — `*.test.ts` and
`*.spec.ts` sitting beside source are still linted, and appeared in 3 of the samples read.
This inflates both sides' counts and is not yet fixed.

### Findings excluded from both totals

Both sides produced an identical **2,132** `ruleId`-bearing messages of the form
*"Definition for rule X was not found"*, emitted when a scanned repo's own
`eslint-disable` comments reference a plugin the harness does not load
(`@typescript-eslint`, `n8n-nodes-base`, `unicorn`, …). These are not findings and are
excluded. Their exactly matching count on both sides is a useful check that the harness
treated the two identically.

---

## 4 · Running the benchmark, step by step

Anyone should be able to reproduce every published number from a clean machine. Each step
states what it produces and what would invalidate it.

### Step 0 — Prerequisites

```bash
node --version    # 24.x — the plugins declare >=18, the benchmark is pinned to 24
docker --version  # only needed for Step 5 (OpenSSF Scorecard)
gh auth token     # only needed for Step 5
```

### Step 1 — Measure PUBLISHED packages, never the local build

The single most common way to get a wrong number here. Work from a scratch directory with
the plugins installed from npm:

```bash
mkdir /tmp/ilb && cd /tmp/ilb && npm init -y
npm i -D eslint@10 eslint-plugin-secure-coding eslint-plugin-browser-security \
        eslint-plugin-node-security eslint-plugin-security @typescript-eslint/parser
```

Every runner prints the versions it resolved and **exits 1** if a plugin resolves to the
monorepo `dist/`. Pass `--allow-local` only when you deliberately intend to measure an
unreleased build, and label the result as such.

> A stale `dist/` once produced 22.6% where published measured 36.9%, and again 63.2% where
> published measured 85.5%. If the versions printed at the top are not the versions you meant,
> stop.

### Step 2 — Parity against the competitor's own test suite

```bash
node benchmarks/suites/ilb-competitor-parity/run.mjs
```

Lints all 189 RuleTester cases vendored verbatim from `eslint-plugin-security@4.0.1` with
**every** Interlace rule enabled. Prints RAW parity (all 84 must-detect cases) and WEIGHTED
parity (excluding the 33 cases in 5 classes declared in `wont-fix.json`).

**Produces:** A1, A2. **Invalid if:** any case reports `ruleId: null` with an "ignored"
message — that means ESLint skipped it rather than finding nothing.

### Step 3 — Detection and false positives on the labelled corpus

```bash
node benchmarks/suites/ilb-competitor-parity/head-to-head.mjs
npx tsx benchmarks/suites/ilb-juliet/run.ts        # exact TP / FP / FN, all plugins
```

`benchmarks/corpus/` holds 143 files across 34 CWE classes — 76 under `vulnerable/` that must
be detected, 67 under `safe/` that must stay silent. Because every file is labelled, TP, FP
**and FN** are exact rather than estimated.

**Produces:** A3–A5, B1, B2b. **Tier: INT** — we authored these fixtures, so a high score is
a regression gate, not a marketing claim.

### Step 4 — Real source, 20 open-source projects

```bash
node benchmarks/suites/ilb-real-source/run.mjs --corpus=popular
```

Clones 20 projects `--depth 1` into a gitignored cache (reused on later runs), then lints
every non-excluded file with **`recommended` on both sides** — 80 rules against 14.

**Produces:** B3–B5, F1. **Tier: VOL** — finding counts, not correctness.

### Step 5 — Supply-chain health

```bash
docker run --rm -e GITHUB_AUTH_TOKEN=$(gh auth token) \
  gcr.io/openssf/scorecard:stable --repo=github.com/ofri-peretz/eslint --format=json
```

**Produces:** G2–G13. The public badge (G1) comes from the OpenSSF's own infrastructure at
`api.securityscorecards.dev` and evaluates a *smaller* check set — it cannot see
`Branch-Protection` without an admin-scoped token, so it reads higher. Report both, labelled.

### Step 6 — Precision: the step that cannot be automated

Volume is not quality. Steps 2–4 say how much each plugin reports; only this says how much
of it is right.

```bash
node quality-sample.mjs us 3        # stratified sample, ours
node quality-sample.mjs them 3      # same for the competitor
```

Then **read every sampled finding and label it** TP / FP / undecidable with a one-line
reason. Because findings cluster hard by rule (the top 11 rules are 72% of ours), judging the
*rule* from a few of its findings and weighting by that rule's full volume covers ~80% of all
findings.

**Produces:** B2, B2a. **State the coverage** — which repos contributed samples, and what
fraction of total findings the classified rules represent. It is an extrapolation, not a census.

### Step 7 — Measure against a different competitor

```bash
npm i -D eslint-plugin-no-unsanitized
node benchmarks/suites/ilb-real-source/run.mjs --competitor=eslint-plugin-no-unsanitized
```

Any security plugin on npm. This is how we learned that "quieter" is not a property of our
plugins: against a narrow, precise plugin we are **louder** (184 per 1k files vs 127, on 4 of
4 projects). Never publish a relative claim without naming what it was measured against.

### Step 8 — Record the result

Update [BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md), keeping each number's evidence tier and
the command that produced it. A figure with no committed runner is not a measurement — that is
how an entire real-source section was lost once already.

---

## 5 · Exact rule lists

Generated from the published packages' own exports.

```
## eslint-plugin-secure-coding  —  33 rules total, 18 in recommended
RECOMMENDED (used by ilb-real-source):
  no-fail-open-auth
  no-graphql-injection
  no-hardcoded-credentials
  no-homoglyph-identifiers
  no-improper-sanitization
  no-ldap-injection
  no-log-injection
  no-privilege-escalation
  no-redos-vulnerable-regex
  no-sensitive-data-exposure
  no-sql-injection
  no-template-injection
  no-unlimited-resource-allocation
  no-unsafe-deserialization
  no-unsafe-regex-construction
  no-weak-password-recovery
  no-xpath-injection
  no-xxe-injection
NOT in recommended (15) — used only by corpus/parity suites:
  detect-non-literal-regexp
  detect-object-injection
  detect-weak-password-validation
  no-bidi-characters
  no-directive-injection
  no-electron-security-issues
  no-format-string-injection
  no-hardcoded-session-tokens
  no-improper-type-validation
  no-insecure-comparison
  no-missing-authentication
  no-pii-in-logs
  no-unchecked-loop-condition
  require-backend-authorization
  require-secure-defaults

## eslint-plugin-browser-security  —  46 rules total, 32 in recommended
RECOMMENDED (used by ilb-real-source):
  no-allow-arbitrary-loads
  no-clickjacking
  no-client-side-auth-logic
  no-cookie-auth-tokens
  no-credentials-in-query-params
  no-disabled-certificate-validation
  no-dynamic-service-worker-url
  no-eval
  no-filereader-innerhtml
  no-http-urls
  no-incomplete-url-sanitization
  no-innerhtml
  no-insecure-redirects
  no-insecure-websocket
  no-jwt-in-storage
  no-postmessage-innerhtml
  no-postmessage-wildcard-origin
  no-sensitive-cookie-js
  no-sensitive-indexeddb
  no-sensitive-localstorage
  no-sensitive-sessionstorage
  no-unsafe-eval-csp
  no-unsafe-inline-csp
  no-unvalidated-deeplinks
  no-websocket-eval
  no-websocket-innerhtml
  no-worker-message-innerhtml
  require-blob-url-revocation
  require-cookie-secure-attrs
  require-https-only
  require-postmessage-origin-check
  require-websocket-wss
NOT in recommended (14) — used only by corpus/parity suites:
  detect-mixed-content
  no-missing-cors-check
  no-missing-csrf-protection
  no-missing-security-headers
  no-password-in-url
  no-permissive-cors
  no-sensitive-data-in-analytics
  no-sensitive-data-in-cache
  no-tracking-without-consent
  no-unencrypted-transmission
  no-unescaped-url-parameter
  require-csp-headers
  require-mime-type-validation
  require-url-validation

## eslint-plugin-node-security  —  42 rules total, 30 in recommended
RECOMMENDED (used by ilb-real-source):
  detect-child-process
  detect-eval-with-expression
  detect-non-literal-fs-filename
  detect-suspicious-dependencies
  no-arbitrary-file-access
  no-buffer-overread
  no-cryptojs
  no-data-in-temp-storage
  no-deprecated-buffer
  no-dynamic-algorithm-selection
  no-dynamic-command-string
  no-ecb-mode
  no-env-injection
  no-insecure-http-parser
  no-math-random-crypto
  no-self-signed-certs
  no-shell-injection
  no-ssrf
  no-static-iv
  no-timing-unsafe-compare
  no-toctou-vulnerability
  no-unbounded-decompression
  no-unsafe-buffer-alloc
  no-unsafe-dynamic-require
  no-weak-cipher-algorithm
  no-weak-hash-algorithm
  no-zip-slip
  require-aead-tag-verification
  require-dependency-integrity
  require-stream-error-handler
NOT in recommended (12) — used only by corpus/parity suites:
  lock-file
  no-cryptojs-weak-random
  no-deprecated-cipher-method
  no-dynamic-dependency-loading
  no-dynamic-require
  no-insecure-key-derivation
  no-insecure-rsa-padding
  no-sha1-hash
  prefer-native-crypto
  require-secure-credential-storage
  require-secure-deletion
  require-storage-encryption

## eslint-plugin-security — 14 rules total, 14 in recommended
  security/detect-bidi-characters
  security/detect-buffer-noassert
  security/detect-child-process
  security/detect-disable-mustache-escape
  security/detect-eval-with-expression
  security/detect-new-buffer
  security/detect-no-csrf-before-method-override
  security/detect-non-literal-fs-filename
  security/detect-non-literal-regexp
  security/detect-non-literal-require
  security/detect-object-injection
  security/detect-possible-timing-attacks
  security/detect-pseudoRandomBytes
  security/detect-unsafe-regex

TOTALS: interlace 121 rules / 80 recommended · competitor 14 / 14
```
