# Rule quality program — living tracker

> Everything below is probe-backed. A row moves to DONE only when a test exists
> that FAILS on the unfixed rule, in both directions where the defect has two.
> Started 2026-08-16. Target: one PR covering fixes, tests, gates and docs.

## Standing rules for this work

1. **A QUIET probe proves nothing without a positive control.** Establish the
   rule reports on the shape first, then change one thing. Learned twice.
2. **Defect vs smell.** Never sum them, never report a smell as a finding.
3. **Every option: explicit default in `meta.schema`, overridable by the user.**
4. **TDD.** Test first, watch it fail on the current rule, then fix.
5. **Every rule needs TP + FP + FN cases**, and a case per option state.
6. Re-run the CWE-corpus recall gate in the SAME session as any precision fix —
   a 2026-08 sweep cut FP 10→3 and took FN 18→34.

## Tooling built (done)

- `scripts/rule-audit.ts` — 25 checks, 6 categories, defect/smell tiers
- `scripts/build-rule-ledger.ts --dossier` — 121 dossiers + worklist index
- `scripts/rule-audit-gate.ts` — ratchet; pre-commit scoped, CI full
- `scripts/probe-rule.mts` — one-line behavioural probe
- `packages/eslint-devkit/src/ast/identifier-words.ts` — whole-word matching

## Root causes — fix once, fixes many rules

| # | Root cause | Blast radius | Status |
|---|---|---|---|
| R1 ✅ | **FIXED.** Taint walkers have no `TSAsExpression` arm. `req.query.q as string` is REQUIRED in TS Express (the type is `string \| string[] \| ParsedQs`), so these rules never fire in TS codebases. | no-ssrf, no-timing-unsafe-compare, no-sql-injection, no-template-injection, no-unsafe-deserialization, no-unsafe-regex-construction, no-unchecked-loop-condition | TODO |
| R2 | devkit `isUserInputExpression` = `getText(expr).includes(pattern)` over `['req','request','body','query','params','input','data']`. Both banned patterns at once, in a SHARED helper. `requiredBytes` contains `req`; `metadataLength` contains `data`. | every caller of the devkit helper | TODO |
| R3 | Substring vocabulary matching instead of whole-word. | 7 rules (helper built, not yet wired) | PARTIAL |
| R4 | Crypto rules are literal-only; one `const ALGO = 'md5'` defeats them. | no-weak-hash-algorithm, no-static-iv, no-weak-cipher-algorithm, no-ecb-mode, no-insecure-key-derivation, require-aead-tag-verification | TODO |
| R5 | Name-based taint instead of binding resolution (the FN half — rename a tainted var and detection dies). | ~15 rules | TODO |

## Per-rule worklist — CONFIRMED, probe-backed

Priority = ships in `recommended` at `error` (reaches every consumer).

### P0 — in recommended, wrong on realistic code

| rule | plugin | defect | status |
|---|---|---|---|
| no-shell-injection | node-security | FP CVSS 9.8 on `db.exec()`. | ✅ DONE — gated on isModuleBinding; 12 fixtures made realistic |
| detect-non-literal-fs-filename | node-security | NOT an FN — the partition works (`no-arbitrary-file-access` catches it, one report). The schema DESCRIPTION lied about its default. | ✅ DONE — description corrected, `default: ['process']` declared |
| no-client-side-auth-logic | browser-security | FP: `role` inside `casserole`. | ✅ DONE — whole-word + configurable vocabulary |
| no-xpath-injection | secure-coding | FP on CONSTANT xpath (`//`, `text()` flagged). | TODO |
| no-template-injection | secure-coding | FP on `Handlebars.compile(fs.readFileSync('./tpl.hbs'))`. FN on one hop + casts. | TODO |
| no-xxe-injection | secure-coding | FP: any `new DOMParser()`. FN: `parseXml` (libxmljs2's real API) not in the method list. | TODO |
| no-ldap-injection | secure-coding | FN: ldapjs ALWAYS passes an options object; rule inspects `args[1]` as a string. Misses every real call. | TODO |
| no-unsafe-regex-construction | secure-coding | FN: no `Identifier` and no `TSAsExpression` arm. | TODO |
| no-hardcoded-credentials | secure-coding | FN: `secretAccessKey` (the AWS SDK field name) exempt — `endsWith('key')` only accepts bare `key`. | TODO |
| no-missing-authentication | secure-coding | SELF-SUPPRESSING: matches `ignorePatterns` against the whole handler text; any `res.status(...)` exempts the route. | TODO |

### P1 — wrong, not in recommended

no-hardcoded-session-tokens (FP, CVSS 9.8 on cookie names) · no-improper-type-validation (FP on `x == null`, contradicts no-insecure-comparison) · no-format-string-injection (FP on the correct mitigation; FN on destructuring) · require-secure-deletion (FP on the Express scrub idiom) · require-storage-encryption (matches filenames not payloads) · require-secure-credential-storage (VACUOUS in Node) · prefer-native-crypto (harmful advice: bcryptjs → node:crypto, which has no bcrypt) · no-math-random-crypto (FN on the alphabet-index loop) · no-sensitive-data-exposure (`checkApiResponses` declared, defaulted true, never read) · require-backend-authorization (INVERTED) · no-electron-security-issues (`insecureIpcPattern` unreachable unless the user writes an allowlist) · no-unchecked-loop-condition (`unsafeRecursion` fires only on two fixture names) · detect-weak-password-validation (4 stacked guards; near-vacuous) · detect-object-injection (FN on the canonical prototype-pollution gadget) · no-weak-password-recovery (unsatisfiable `missingRateLimit`) · no-directive-injection · no-privilege-escalation · no-pii-in-logs · no-redos-vulnerable-regex · no-buffer-overread · no-zip-slip · no-static-iv · no-unsafe-dynamic-require · no-sha1-hash · no-arbitrary-file-access · no-toctou-vulnerability · no-data-in-temp-storage · require-stream-error-handler

### Duplicate-coverage — 13 of 49 pairs confirmed

storage triple (jwt + localstorage + sessionstorage) · websocket pair + self-duplicate ·
no-cryptojs ⊂ prefer-native-crypto · cookie pair · ecb/weak-cipher · temp/encryption ·
child-process/shell-injection · credentials/session-tokens · analytics/consent (keep) ·
regexp/loop (keep)

## Test-suite defects (fixtures that LOCK IN bugs)

- `detect-weak-password-validation`: `if (pass.length > 3)` pinned as INVALID
- `detect-weak-password-validation`: `req.body.password.length >= 4` pinned as VALID
- `no-format-string-injection`: `util.format("%s", req.body.format)` pinned INVALID (that is the correct mitigation)
- `detect-object-injection`: `copy[key] = obj[key]` pinned VALID
- `no-directive-injection`: `safeHtml`, `customVar` pinned VALID
- `no-static-iv`, `no-ecb-mode`, `no-weak-hash-algorithm`: variable-held cases pinned as reporting nothing
- `no-unsafe-dynamic-require`: `allowDynamicImport` block passes on broken code (empty valid[], invalid case has no `import()`)
- `no-timing-unsafe-compare`: "canonical CWE-208" invalid case uses a FREE identifier, avoiding the shape that breaks
- Zero `as string` / `as number` in ANY of the five group-E test files — which is why R1 survived

## Ledger state (baseline recorded)

DEFECTS: 92 no-corpus-fixture · 46 inert-suggestion · 45 unasserted-message ·
34 unexercised-option · 22 orphan-message · 9 option-without-default · 6 thin-suite
SMELLS: 48 duplicate-coverage · 40 unconfigurable-vocabulary · 17 textual-matching ·
16 nominal-inference-report · 9 dynamic-regexp · 4 unguarded-recursion ·
3 whole-program-text · 3 nominal-inference-suppress

## Landed tonight

1. `unwrapTypeSyntax` (R1) — 6 rules + shared provenance.ts, 7 regression locks
2. `compileUserPattern` — 5 ReDoS hangs (54.9s → 1.4s) and 5 crash sites
3. `no-eval` — was inverted; `deferDynamicPayloads` option, default self-sufficient
4. `no-client-side-auth-logic` — casserole FP; vocabulary now configurable
5. `no-shell-injection` — every `.exec()` in the ecosystem; now evidence-gated
6. `detect-non-literal-fs-filename` — schema description corrected
7. The ratchet gate caught 2 option-contract regressions I introduced myself

Recall gate re-run after each: **69 TP / 0 FP / 0 FN, unchanged throughout.**

## Remaining scope

- [ ] R1–R5 root causes
- [ ] P0 rules (10)
- [ ] P1 rules (~28)
- [ ] Duplicate-coverage pairs (13)
- [ ] Test-suite bug-locking fixtures
- [ ] browser-security sweep (agent still running)
- [ ] The other ~30 plugins in this repo
- [ ] Docs + one PR
