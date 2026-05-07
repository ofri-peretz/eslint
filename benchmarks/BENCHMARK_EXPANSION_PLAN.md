# Interlace Ecosystem Expansion Plan

> Generated: 2026-02-07 | Based on 17-plugin security benchmark + 8-plugin quality benchmark
> Current Interlace baseline: 194 security rules (10 plugins) + 86 quality rules (7 plugins)

---

## Table of Contents

1. [Quality Rules to Adopt](#1-quality-rules-to-adopt-from-competitors)
2. [Security Rules to Implement](#2-security-rules-to-implement-from-competitors)
3. [FP/FN Remediation Plan](#3-fpfn-remediation-plan)
4. [Systematic Testing Approach](#4-systematic-testing-approach)

---

## 1. Quality Rules to Adopt from Competitors

### Rules Audit Method

Cross-referenced every rule from `eslint-plugin-unicorn` (144 rules), `eslint-plugin-n` (41 rules), and `eslint-plugin-sonarjs` (269 rules) against all 7 Interlace quality plugins. Rules are categorized by:

- **🟢 Already Covered** — Interlace has an equivalent or better rule
- **🟡 Partial Overlap** — Interlace covers some aspects but not all
- **🔴 Gap** — Competitor has the rule, Interlace does not

Only **🔴 Gap** rules are listed below, organized by target Interlace plugin.

---

### A. Rules for `eslint-plugin-reliability` (Currently 8 rules)

| #   | Rule Name (Proposed)       | Source  | Source Rule                            | Priority | Description                                                                                            |
| :-- | :------------------------- | :------ | :------------------------------------- | :------- | :----------------------------------------------------------------------------------------------------- |
| 1   | `no-floating-promise`      | unicorn | `no-thenable`                          | P1       | Objects with `.then()` method can interfere with promise chains. Prevents accidental thenable objects. |
| 2   | `no-useless-promise-wrap`  | unicorn | `no-useless-promise-resolve-reject`    | P1       | Returning `Promise.resolve(x)` in async function is redundant. Auto-fixable.                           |
| 3   | `no-single-promise-method` | unicorn | `no-single-promise-in-promise-methods` | P2       | `Promise.all([singlePromise])` is misleading; use `await` directly.                                    |
| 4   | `no-unnecessary-await`     | unicorn | `no-unnecessary-await`                 | P2       | Awaiting non-promise values (`await 42`) is unnecessary.                                               |
| 5   | `require-error-cause`      | sonarjs | `no-ignored-exceptions`                | P1       | Empty catch blocks hide errors (supplements existing `no-silent-errors` with cause-chaining guidance). |
| 6   | `no-unsafe-optional-chain` | sonarjs | `no-collection-size-mischeck`          | P2       | Misusing `.length` checks with optional chaining (e.g., `arr?.length > 0` without null guard).         |
| 7   | `require-callback-error`   | n       | `handle-callback-err`                  | P2       | Node.js callback pattern: first arg must be checked for error.                                         |
| 8   | `no-callback-literal`      | n       | `no-callback-literal`                  | P2       | Callbacks must follow `(err, result)` pattern — don't pass strings as error arg.                       |

**Estimated total after adoption: 16 rules**

---

### B. Rules for `eslint-plugin-maintainability` (Currently 8 rules)

| #   | Rule Name (Proposed)            | Source  | Source Rule                            | Priority | Description                                                          |
| :-- | :------------------------------ | :------ | :------------------------------------- | :------- | :------------------------------------------------------------------- | --- | ------------------------------------------------- |
| 1   | `no-static-only-class`          | unicorn | `no-static-only-class`                 | P1       | Classes with only static members should be plain objects or modules. |
| 2   | `prefer-default-parameters`     | unicorn | `prefer-default-parameters`            | P2       | Use `function(x = 1)` instead of `x = x                              |     | 1`. Auto-fixable.                                 |
| 3   | `prefer-logical-operator`       | unicorn | `prefer-logical-operator-over-ternary` | P2       | `x ? x : y` → `x                                                     |     | y`. Auto-fixable.                                 |
| 4   | `prefer-switch`                 | unicorn | `prefer-switch`                        | P3       | Multiple `if-else` chains comparing same variable → `switch`.        |
| 5   | `no-useless-spread`             | unicorn | `no-useless-spread`                    | P2       | `[...array]` when array is already an array. Auto-fixable.           |
| 6   | `no-useless-fallback-in-spread` | unicorn | `no-useless-fallback-in-spread`        | P3       | `{...obj                                                             |     | {}}` — fallback is unnecessary in spread context. |
| 7   | `prefer-single-boolean-return`  | sonarjs | `prefer-single-boolean-return`         | P2       | `if (cond) return true; return false;` → `return cond`.              |
| 8   | `no-identical-conditions`       | sonarjs | `no-all-duplicated-branches`           | P1       | All branches of `if/else` have identical code — dead branching.      |
| 9   | `no-duplicated-branches`        | sonarjs | `no-duplicated-branches`               | P2       | Two branches of `if/else if` have identical bodies.                  |
| 10  | `no-collapsible-if`             | sonarjs | `no-collapsible-if`                    | P2       | Nested `if` without else can be collapsed. Auto-fixable.             |

**Estimated total after adoption: 18 rules**

---

### C. Rules for `eslint-plugin-conventions` (Currently 9 rules)

| #   | Rule Name (Proposed)           | Source          | Source Rule                    | Priority | Description                                                                     |
| :-- | :----------------------------- | :-------------- | :----------------------------- | :------- | :------------------------------------------------------------------------------ |
| 1   | `prefer-number-properties`     | unicorn         | `prefer-number-properties`     | P1       | `isNaN()` → `Number.isNaN()`, `isFinite()` → `Number.isFinite()`. Auto-fixable. |
| 2   | `prefer-string-slice`          | unicorn         | `prefer-string-slice`          | P2       | `.substring()` / `.substr()` → `.slice()`. Auto-fixable.                        |
| 3   | `prefer-string-replace-all`    | unicorn         | `prefer-string-replace-all`    | P2       | `.replace(/x/g, y)` → `.replaceAll('x', y)`. Auto-fixable.                      |
| 4   | `prevent-abbreviations`        | unicorn         | `prevent-abbreviations`        | P2       | `e` → `error`, `req` → `request`, `res` → `response`. Configurable.             |
| 5   | `prefer-template-literal`      | unicorn         | N/A (custom)                   | P1       | String concatenation → template literals (`"a" + b` → `` `a${b}` ``).           |
| 6   | `no-magic-numbers`             | sonarjs         | `no-magic-numbers`             | P1       | Unexplained numeric literals. Allow 0, 1, -1. Configurable threshold.           |
| 7   | `consistent-return-type`       | sonarjs         | `function-return-type`         | P2       | Functions should return consistent types across all paths.                      |
| 8   | `require-array-join-separator` | unicorn         | `require-array-join-separator` | P3       | `[1,2,3].join()` → `[1,2,3].join(',')`. Explicit separator.                     |
| 9   | `prefer-includes`              | unicorn         | `prefer-includes`              | P1       | `.indexOf(x) !== -1` → `.includes(x)`. Auto-fixable.                            |
| 10  | `no-nested-ternary`            | unicorn/sonarjs | `no-nested-ternary`            | P2       | Already in maintainability — add cross-reference if needed.                     |

**Estimated total after adoption: 18 rules**

---

### D. Rules for `eslint-plugin-operability` (Currently 6 rules)

| #   | Rule Name (Proposed) | Source                | Source Rule          | Priority | Description                                            |
| :-- | :------------------- | :-------------------- | :------------------- | :------- | :----------------------------------------------------- |
| 1   | `no-alert`           | unicorn (ESLint core) | `no-alert`           | P1       | `alert()`, `confirm()`, `prompt()` in production code. |
| 2   | `no-exclusive-tests` | sonarjs               | `no-exclusive-tests` | P1       | `.only()` in test suites must not be committed.        |
| 3   | `no-disabled-tests`  | sonarjs               | `no-skipped-tests`   | P2       | `.skip()` tests should be tracked/removed.             |
| 4   | `no-unstable-tests`  | sonarjs               | `stable-tests`       | P3       | Tests relying on timing, random, or external state.    |

**Estimated total after adoption: 10 rules**

---

### E. Rules for `eslint-plugin-modernization` (Currently 3 rules)

| #   | Rule Name (Proposed)      | Source    | Source Rule                  | Priority | Description                                              |
| :-- | :------------------------ | :-------- | :--------------------------- | :------- | :------------------------------------------------------- |
| 1   | `prefer-node-protocol`    | unicorn/n | `prefer-node-protocol`       | P1       | `require('fs')` → `require('node:fs')`. Auto-fixable.    |
| 2   | `prefer-spread`           | unicorn   | `prefer-spread`              | P1       | `Array.from(x)` → `[...x]`. Auto-fixable.                |
| 3   | `prefer-structured-clone` | unicorn   | `prefer-structured-clone`    | P2       | `JSON.parse(JSON.stringify(x))` → `structuredClone(x)`.  |
| 4   | `prefer-array-flat-map`   | unicorn   | `prefer-array-flat-map`      | P2       | `.map().flat()` → `.flatMap()`. Auto-fixable.            |
| 5   | `prefer-array-flat`       | unicorn   | `prefer-array-flat`          | P3       | Legacy flatten patterns → `Array.flat()`.                |
| 6   | `prefer-from-entries`     | unicorn   | `prefer-object-from-entries` | P3       | Manual object construction → `Object.fromEntries()`.     |
| 7   | `no-new-buffer`           | n         | `no-deprecated-api` (Buffer) | P1       | `new Buffer()` → `Buffer.from()` / `Buffer.alloc()`.     |
| 8   | `prefer-promises-fs`      | n         | `prefer-promises/fs`         | P2       | `fs.readFile` → `fs.promises.readFile` or `fs/promises`. |
| 9   | `prefer-promises-dns`     | n         | `prefer-promises/dns`        | P3       | `dns.lookup` → `dns.promises.lookup`.                    |
| 10  | `prefer-top-level-await`  | unicorn   | `prefer-top-level-await`     | P3       | IIFEs for top-level async → top-level `await`.           |

**Estimated total after adoption: 13 rules**

---

### F. Rules for `eslint-plugin-modularity` (Currently 5 rules)

| #   | Rule Name (Proposed) | Source  | Source Rule          | Priority | Description                                                      |
| :-- | :------------------- | :------ | :------------------- | :------- | :--------------------------------------------------------------- |
| 1   | `no-mutable-exports` | import  | `no-mutable-exports` | P1       | Exported `let`/`var` bindings cause subtle bugs.                 |
| 2   | `prefer-export-from` | unicorn | `prefer-export-from` | P2       | `import { x } from 'a'; export { x }` → `export { x } from 'a'`. |
| 3   | `prefer-module`      | unicorn | `prefer-module`      | P2       | CommonJS → ESM patterns.                                         |
| 4   | `no-global-state`    | Custom  | N/A                  | P1       | Mutating `globalThis`/`window`/`global` state.                   |

**Estimated total after adoption: 9 rules**

---

### Quality Adoption Summary

| Plugin                          | Current | +New    | Total  | Net Change |
| :------------------------------ | :------ | :------ | :----- | :--------- |
| `eslint-plugin-reliability`     | 8       | +8      | **16** | +100%      |
| `eslint-plugin-maintainability` | 8       | +10     | **18** | +125%      |
| `eslint-plugin-conventions`     | 9       | +9      | **18** | +100%      |
| `eslint-plugin-operability`     | 6       | +4      | **10** | +67%       |
| `eslint-plugin-modernization`   | 3       | +10     | **13** | +333%      |
| `eslint-plugin-modularity`      | 5       | +4      | **9**  | +80%       |
| **Quality Fleet Total**         | **39**  | **+45** | **84** | **+115%**  |

> Combined with the 47 `import-next` rules, the quality fleet grows to **131 rules**.

---

## 2. Security Rules to Implement from Competitors

### Rules that competitors caught and Interlace didn't (from benchmark)

These are rules that directly address our **9 False Negatives** in the security benchmark, validated by competitor detection data.

#### Tier 1 — Critical (Directly addresses FNs)

| #   | Rule Name              | Target Plugin          | Competitor Source                                 | FN Addressed                               | CWE     | Description                                                                                           |
| :-- | :--------------------- | :--------------------- | :------------------------------------------------ | :----------------------------------------- | :------ | :---------------------------------------------------------------------------------------------------- |
| 1   | `no-inner-html`        | `browser-security`     | SDL `no-inner-html`, no-unsanitized `property`    | `vuln_xss_innerhtml`                       | CWE-79  | Detect `element.innerHTML = userInput`. XSS via direct DOM assignment.                                |
| 2   | `no-insecure-random`   | `secure-coding`        | SDL `no-insecure-random`, SonarJS `pseudo-random` | `vuln_random_token`, `vuln_random_session` | CWE-330 | Detect `Math.random()` for security-sensitive operations (tokens, sessions, IDs).                     |
| 3   | `no-nosql-injection`   | `mongodb-security`     | SonarJS `no-hardcoded-passwords` (partial)        | `vuln_nosql_mongo`, `vuln_nosql_where`     | CWE-943 | Detect MongoDB `$where` operator, `$gt`/`$ne` from user input, eval in queries.                       |
| 4   | `no-ssrf`              | `secure-coding`        | (none caught, but critical gap)                   | `vuln_ssrf_fetch`, `vuln_ssrf_axios`       | CWE-918 | Detect `fetch(userInput)`, `axios.get(req.query.url)` — Server-Side Request Forgery.                  |
| 5   | `no-open-redirect`     | `express-security`     | (none caught directly)                            | `vuln_redirect`                            | CWE-601 | Detect `res.redirect(req.query.url)` without validation. Open redirect vulnerability.                 |
| 6   | `no-sql-string-concat` | `pg` / `secure-coding` | SonarJS `sql-queries` (partial)                   | `vuln_sql_string_concat`                   | CWE-89  | Detect `"SELECT * FROM " + userInput` — SQL injection via string concatenation (vs template literal). |

#### Tier 2 — Important (From competitor rule sets, not current FNs)

| #   | Rule Name                    | Target Plugin      | Competitor Source                                | CWE     | Description                                                                                       |
| :-- | :--------------------------- | :----------------- | :----------------------------------------------- | :------ | :------------------------------------------------------------------------------------------------ |
| 7   | `no-document-write`          | `browser-security` | SDL `no-document-write`, no-unsanitized `method` | CWE-79  | Detect `document.write()` — DOM XSS sink. Already caught as TP but ensure rule exists explicitly. |
| 8   | `no-postmessage-star-origin` | `browser-security` | SDL `no-postmessage-star-origin`, unicorn        | CWE-346 | `window.postMessage(data, '*')` — leaks data to any origin.                                       |
| 9   | `no-document-domain`         | `browser-security` | SDL `no-document-domain`                         | CWE-346 | Writing to `document.domain` relaxes same-origin policy.                                          |
| 10  | `no-unsafe-alloc`            | `node-security`    | SDL `no-unsafe-alloc`                            | CWE-200 | `Buffer.allocUnsafe()` may contain old memory data.                                               |
| 11  | `no-insecure-url`            | `secure-coding`    | SDL `no-insecure-url`                            | CWE-319 | Hardcoded `http://` URLs (should be `https://`).                                                  |
| 12  | `no-cookies`                 | `browser-security` | SDL `no-cookies`                                 | CWE-614 | Raw `document.cookie` access without httpOnly/secure flags.                                       |

#### Tier 3 — Strategic (SonarJS-exclusive security rules worth adopting)

| #   | Rule Name                      | Target Plugin      | Source Rule                                | CWE     | Description                                                                                                           |
| :-- | :----------------------------- | :----------------- | :----------------------------------------- | :------ | :-------------------------------------------------------------------------------------------------------------------- |
| 13  | `no-clear-text-protocols`      | `secure-coding`    | SonarJS `no-clear-text-protocols`          | CWE-319 | `ftp://`, `telnet://`, unencrypted SMTP connections.                                                                  |
| 14  | `no-unverified-hostname`       | `node-security`    | SonarJS `unverified-hostname`              | CWE-297 | Disabling hostname verification in TLS connections.                                                                   |
| 15  | `no-unsafe-unzip`              | `node-security`    | SonarJS `no-unsafe-unzip`                  | CWE-400 | Archive extraction without resource limits (zip bomb). Supplements existing `no-zip-slip`.                            |
| 16  | `no-confidential-logging`      | `secure-coding`    | SonarJS `confidential-information-logging` | CWE-532 | Logging passwords, tokens, SSNs. Supplements existing `no-pii-in-logs`.                                               |
| 17  | `require-csp`                  | `browser-security` | SonarJS `content-security-policy`          | CWE-693 | Missing Content-Security-Policy headers.                                                                              |
| 18  | `no-disabled-auto-escaping`    | `secure-coding`    | SonarJS `disabled-auto-escaping`           | CWE-79  | Disabling template engine auto-escaping (EJS, Handlebars, Pug).                                                       |
| 19  | `no-mixed-content`             | `browser-security` | SonarJS `no-mixed-content`                 | CWE-319 | HTTPS page loading HTTP resources.                                                                                    |
| 20  | `no-hardcoded-secrets-entropy` | `secure-coding`    | no-secrets `no-secrets`                    | CWE-798 | Shannon entropy-based secret detection (API keys, tokens in source). Supplements existing `no-hardcoded-credentials`. |

#### Security Adoption Summary

| Tier                         | Count   | Impact                                 |
| :--------------------------- | :------ | :------------------------------------- |
| **Tier 1** (FN fixes)        | 6 rules | Eliminates all 9 current benchmark FNs |
| **Tier 2** (SDL parity)      | 6 rules | Matches Microsoft SDL coverage         |
| **Tier 3** (SonarJS parity)  | 8 rules | Matches SonarSource coverage           |
| **Total new security rules** | **20**  | Security fleet grows to **214 rules**  |

---

## 3. FP/FN Remediation Plan

### Security FPs (9 false positives to fix)

| #   | False Positive             | Rule                                         | Root Cause                                     | Fix                                                                   |
| :-- | :------------------------- | :------------------------------------------- | :--------------------------------------------- | :-------------------------------------------------------------------- |
| 1   | `safe_cmd_validated`       | `detect-child-process`                       | Flags validated `execFile` calls               | Add allowlist for `execFile` with literal command + nested array args |
| 2   | `safe_cmd_validated`       | `no-graphql-injection`                       | Flags template literal in non-GraphQL context  | Check for GraphQL indicators (keywords, operations) before flagging   |
| 3   | `safe_path_allowlist`      | `detect-non-literal-fs-filename`             | Flags `fs.readFile(ALLOWLIST[key])`            | Recognize allowlist/whitelist pattern (constant object + key lookup)  |
| 4   | `safe_path_regex`          | `detect-non-literal-fs-filename`             | Flags validated `path.join()` with regex check | Recognize `path.resolve` + `startsWith` validation guard              |
| 5   | `safe_template_logging`    | `no-graphql-injection`                       | Flags template literals used for logging       | Check callee context (logger, console → safe)                         |
| 6   | `safe_proto_allowlist`     | `no-sensitive-data-exposure`                 | Flags allowlist-based property access          | Recognize allowlist/enum pattern                                      |
| 7   | `safe_proto_nullproto`     | `detect-object-injection`                    | Flags `Object.create(null)` access             | Recognize null-prototype objects as safe                              |
| 8   | `safe_random_shuffle`      | `detect-object-injection`                    | Flags array swap `arr[i] = arr[j]`             | Recognize Fisher-Yates shuffle pattern                                |
| 9   | `safe_timing_compare`      | `no-insecure-comparison`                     | Flags `.length` comparison                     | Exclude `.length` property access from timing check                   |
| 10  | `safe_redirect_sameorigin` | `no-graphql-injection`, `no-xpath-injection` | Flags URL path in template literal             | Check for URL/redirect context vs injection context                   |

### Security FNs (9 false negatives to fix)

| #   | Missed Vulnerability     | Category        | Fix Rule                                       | Implementation                                                                        |
| :-- | :----------------------- | :-------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------ |
| 1   | `vuln_sql_string_concat` | SQL Injection   | Enhance `pg/no-unsafe-query`                   | Add detection for `"SELECT " + var` string concatenation (not just template literals) |
| 2   | `vuln_xss_innerhtml`     | XSS             | **New: `browser-security/no-inner-html`**      | Detect `el.innerHTML = expr` assignments                                              |
| 3   | `vuln_random_token`      | Insecure Random | **New: `secure-coding/no-insecure-random`**    | Detect `Math.random()` in security contexts                                           |
| 4   | `vuln_random_session`    | Insecure Random | Same as above                                  | Same rule covers session/token/ID contexts                                            |
| 5   | `vuln_nosql_mongo`       | NoSQL Injection | **New: `mongodb-security/no-nosql-injection`** | Detect `$where` operator and unvalidated query objects                                |
| 6   | `vuln_nosql_where`       | NoSQL Injection | Same as above                                  | `$where` with string expressions                                                      |
| 7   | `vuln_ssrf_fetch`        | SSRF            | **New: `secure-coding/no-ssrf`**               | Detect `fetch(userInput)` without URL validation                                      |
| 8   | `vuln_ssrf_axios`        | SSRF            | Same as above                                  | Detect `axios.get(req.query.url)`                                                     |
| 9   | `vuln_redirect`          | Open Redirect   | **New: `express-security/no-open-redirect`**   | Detect `res.redirect(req.query.url)`                                                  |

### Quality FPs (31 false positives — 2 rules responsible for 95%+)

| Rule                                          | FP Count                              | Root Cause                                                                             | Fix                                                                                                                                                                                               |
| :-------------------------------------------- | :------------------------------------ | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reliability/no-missing-null-checks`          | **73 violations** across 31 functions | Over-aggressive: flags every property access as potential null deref, even with guards | 1. Recognize optional chaining (`?.`) as null guard 2. Recognize nullish coalescing (`??`) 3. Recognize early-return guard patterns 4. Ignore function parameters (assumed non-null unless typed) |
| `reliability/no-unhandled-promise`            | **26 violations** across 20 functions | Over-aggressive: flags return values of functions that might be promise-like           | 1. Don't flag `return fetch(...)` (caller handles) 2. Don't flag inside try/catch 3. Don't flag `.then()` chains                                                                                  |
| `reliability/require-network-timeout`         | **5 violations** across 5 functions   | Flags custom timeout patterns                                                          | Recognize `AbortController` + `setTimeout` pattern as valid timeout                                                                                                                               |
| `maintainability/consistent-function-scoping` | **8 violations** across 6 functions   | Flags methods in class bodies                                                          | Don't flag class methods or DI factory patterns                                                                                                                                                   |
| `maintainability/identical-functions`         | **3 violations**                      | False similarity detection                                                             | Increase minimum threshold for function body similarity                                                                                                                                           |

### Quality FNs (6 missed anti-patterns)

| #   | Missed Problem              | Category      | Fix                                                                                                                                                |
| :-- | :-------------------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `prob_verbose_error`        | Operability   | Enhance `operability/no-verbose-error-messages` — detect template literals in `new Error()` with variable interpolation of host/port/user patterns |
| 2   | `prob_magic_numbers`        | Conventions   | **New: `conventions/no-magic-numbers`** — flag unexplained numeric literals (exclude 0, 1, -1, array indices)                                      |
| 3   | `prob_inconsistent_returns` | Conventions   | **New: `conventions/consistent-return-type`** — detect functions returning mixed types across branches                                             |
| 4   | `prob_string_concat`        | Conventions   | **New: `conventions/prefer-template-literal`** — `"a" + b` → `` `a${b}` ``                                                                         |
| 5   | `prob_mutable_export`       | Modularity    | **New: `modularity/no-mutable-exports`** — flag `export let` / `export var`                                                                        |
| 6   | `prob_new_buffer`           | Modernization | **New: `modernization/no-new-buffer`** — flag `new Buffer()` → `Buffer.from()` / `Buffer.alloc()`                                                  |

---

## 4. Systematic Testing Approach

### The Benchmark-Driven Development (BDD) Skill

Create a reusable skill file at `.agent/skills/benchmark-driven-rule-dev/SKILL.md` that codifies the following TDD workflow for every rule change:

#### Workflow: Fix or Create a Rule

```
1. IDENTIFY — From benchmark results JSON, identify the specific FP/FN
2. REPRODUCE — Write a minimal fixture that demonstrates the issue
3. ADD TO BENCHMARK — Add fixture to quality-antipatterns.js or safe-patterns.js
4. UPDATE EXPECTATIONS — Add to EXPECTED_DETECTIONS or EXPECTED_NO_DETECTIONS map
5. RED — Run benchmark to confirm failure (FP fires or FN misses)
6. FIX — Implement the rule change in the Interlace monorepo
7. UNIT TEST — Add test cases in the rule's .test.ts file
8. GREEN — Run benchmark to confirm fix (FP silenced or FN caught)
9. REGRESSION — Run full benchmark to verify no regressions
10. RECORD — Update benchmark results JSON with new date
```

#### Automated Verification Script

After every batch of changes, run:

```bash
# Security benchmark
npm run benchmark:fn-fp

# Quality benchmark
npm run benchmark:quality

# Compare to baseline
node scripts/compare-results.js
```

#### Fixture Standards

- **Naming**: `vuln_<category>_<variant>` for vulnerable, `safe_<category>_<variant>` for safe
- **Documentation**: Every fixture function must have a 1-line comment explaining WHY it's vulnerable/safe
- **Isolation**: Each fixture tests exactly ONE pattern — no compound vulnerabilities
- **Coverage**: Every EXPECTED_DETECTIONS entry must have a corresponding fixture function
- **Balance**: Maintain ~1:1 ratio of vulnerable:safe fixtures per category

#### Regression Gate

Before any Interlace plugin release:

```
Security F1 ≥ 77.5% (current baseline)
Security FP ≤ 9 (current baseline — should decrease)
Security FN ≤ 9 (current baseline — should decrease)
Quality Recall ≥ 85% (current baseline)
Quality FP ≤ 31 (current baseline — should decrease)
```

#### CI Integration (Future)

Add to Interlace CI pipeline:

```yaml
benchmark-regression:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run benchmark:fn-fp
    - run: npm run benchmark:quality
    - run: node scripts/assert-no-regression.js
```

---

## Execution Order

### Phase 1: Fix Existing FPs (Week 1)

1. Fix `no-missing-null-checks` — eliminates 73 FP violations (biggest win)
2. Fix `no-unhandled-promise` — eliminates 26 FP violations
3. Fix `detect-object-injection` — 2 security FPs
4. Fix `no-graphql-injection` — 3 security FPs
5. Fix `detect-non-literal-fs-filename` — 2 security FPs
6. Fix remaining security FPs (`no-sensitive-data-exposure`, `no-insecure-comparison`, `no-xpath-injection`)
7. Re-run both benchmarks → target: **Security FP ≤ 3, Quality FP ≤ 5**

### Phase 2: Fix Existing FNs (Week 2)

1. Implement `no-insecure-random` (covers 2 FNs)
2. Implement `no-inner-html` (covers 1 FN)
3. Enhance `no-unsafe-query` for string concat (covers 1 FN)
4. Implement `no-ssrf` (covers 2 FNs)
5. Implement `no-open-redirect` (covers 1 FN)
6. Implement `no-nosql-injection` (covers 2 FNs)
7. Implement quality FN fixes (6 new rules/enhancements)
8. Re-run both benchmarks → target: **Security FN ≤ 1, Quality FN ≤ 1**

### Phase 3: Adopt Competitor Quality Rules (Weeks 3-4)

1. Batch 1 (P1 rules): 12 rules across all quality plugins
2. Batch 2 (P2 rules): 20 rules
3. Batch 3 (P3 rules): 13 rules
4. Add benchmark fixtures for each new rule
5. Re-run quality benchmark → target: **Quality F1 ≥ 85%**

### Phase 4: Adopt Competitor Security Rules (Weeks 5-6)

1. Tier 1 (FN fixes): 6 rules — already done in Phase 2
2. Tier 2 (SDL parity): 6 rules
3. Tier 3 (SonarJS parity): 8 rules
4. Add benchmark fixtures for each new rule
5. Re-run security benchmark → target: **Security F1 ≥ 90%**

### Phase 5: Create BDD Skill + CI Gate (Week 7)

1. Create `.agent/skills/benchmark-driven-rule-dev/SKILL.md`
2. Create `scripts/compare-results.js`
3. Create `scripts/assert-no-regression.js`
4. Add CI workflow
5. Document benchmark methodology update in knowledge base

---

## Success Criteria

| Metric         | Current | Phase 1 | Phase 2 | Phase 4 | Target   |
| :------------- | :------ | :------ | :------ | :------ | :------- |
| Security F1    | 77.5%   | 80%+    | 88%+    | 92%+    | **≥90%** |
| Security FP    | 9       | ≤3      | ≤3      | ≤3      | **≤3**   |
| Security FN    | 9       | 9       | ≤1      | 0       | **0**    |
| Quality F1     | 64.8%   | 78%+    | 83%+    | 85%+    | **≥85%** |
| Quality FP     | 31      | ≤5      | ≤5      | ≤5      | **≤5**   |
| Quality FN     | 6       | 6       | ≤1      | 0       | **0**    |
| Security Rules | 194     | 194     | 200     | 214     | **214+** |
| Quality Rules  | 86      | 86      | 92      | 131     | **131+** |
