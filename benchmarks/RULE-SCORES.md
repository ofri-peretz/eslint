# Rule scores — every measurement, with the command that produced it

**2026-08-18.** One row per measurement actually run, not per claim made. A number
with no command beside it is not in this file
([§0.1](../BENCHMARK-CRITERIA.md)).

Environment: Node 24 · ESLint 10.8.1 · `eslint-plugin-secure-coding@4.3.0` +
`eslint-plugin-browser-security@1.4.1` + `eslint-plugin-node-security@4.13.1` ·
competitors `eslint-plugin-security@4.0.1`, `eslint-plugin-regexp`.

Real-source corpus: **20 repositories · 21,146 files · 3,036,307 LOC**, test
directories and colocated `*.test.*` excluded, minified excluded by path and by
average line length.

---

## 1. Corpus duel — our fixtures, both sides

`npx tsx benchmarks/suites/ilb-rule-duel/run.mjs <plugin>/<rule>`

**Tier `INT`.** Both sides run on fixtures we wrote. A regression gate and a
statement about which shapes each implementation can see — *not* a precision
claim about real code.

| Rule | Fixtures | Ours F1 | Competitor | Theirs F1 |
| :--- | ---: | ---: | :--- | ---: |
| `secure-coding/detect-object-injection` | 14v/14s | **100.0%** | `security/detect-object-injection` | 60.0% |
| `secure-coding/no-redos-vulnerable-regex` | 14v/14s | **100.0%** | `security/detect-unsafe-regex` | 60.0% |
| " | " | " | `regexp/no-super-linear-backtracking` | **88.0%** |
| `secure-coding/detect-non-literal-regexp` | 15v/15s | **100.0%** | `security/detect-non-literal-regexp` | 70.6% |
| `node-security/detect-non-literal-fs-filename` | 10v/10s | **100.0%** | `security/detect-non-literal-fs-filename` | 71.4% |

`eslint-plugin-regexp` is the honest competitor for ReDoS: it ties us on
precision (0 FP) and loses only on patterns built at RUNTIME, which it does not
analyse. We share `scslre` with it.

## 2. Real-source precision — code we did not write

`node benchmarks/suites/ilb-real-source/run.mjs --allow-local --sample=N --sample-rules=<rule>`

**Tier `PUB`.** Every finding hand-labelled TP / FP / undecidable with a reason;
labels in [`suites/ilb-real-source/SAMPLED-FP-2026-08-17.md`](./suites/ilb-real-source/SAMPLED-FP-2026-08-17.md).

| Rule | Findings on corpus | Labelled | TP | FP | Criterion | Verdict |
| :--- | ---: | ---: | ---: | ---: | :--- | :--- |
| `node-security/detect-non-literal-fs-filename` | **1** | 1 (census) | 1 | 0 | census | **passes** |
| `secure-coding/no-redos-vulnerable-regex` | 123 | 22 | ≥4 | — | ratio, `error` ≥95% | **unscored** |
| `secure-coding/detect-non-literal-regexp` | 243 | 10 | 3 | 7 | opt-in, no floor | 30% |
| `secure-coding/detect-object-injection` | 14,696 | 13 | 0 | 13 | opt-in, no floor | 0% |

`no-redos-vulnerable-regex` reads *unscored*, not a percentage, on purpose: the
generic timing sweep behind it can **confirm** that a pattern backtracks and
cannot **prove** that one does not — two patterns it called flat ran 167 ms and
956 ms under a crafted input. A method that errs in one direction does not get to
report a rate.

### `detect-non-literal-fs-filename` — the fix trail

Each step re-measured on the full corpus, recall re-checked on the duel:

| Step | Findings | Duel |
| :--- | ---: | :--- |
| Start of 2026-08-17 | 37 | 10/10, F1 100% |
| Literal branch narrowed to sensitive targets; `process.pid` no longer taint | 15 | unchanged |
| `ctx`/`context` require request evidence; taint-as-base; destructured `path` import | **1** | unchanged |

The one finding is `fs.readFileSync('/etc/passwd')` in `pm2/lib/tools/passwd.js`
— a TRUE POSITIVE the old rule **missed**, because it had no `../` to match.

## 3. Ecosystem volume — the census

`node benchmarks/suites/ilb-real-source/run.mjs --allow-local --all-rules`

121 rules enabled, 82 fired, **39 silent on 3.04M lines** — the silent ones are
listed by name in the output, because an absent row reads as "fine" and a named
zero reads as "unverified".

| Findings | per 1k LOC | Rule |
| ---: | ---: | :--- |
| 14,696 | 4.84 | `secure-coding/detect-object-injection` |
| 2,392 | 0.79 | `secure-coding/no-improper-type-validation` |
| 1,830 | 0.60 | `secure-coding/no-insecure-comparison` |
| 435 | 0.14 | `secure-coding/no-unchecked-loop-condition` |
| 366 | 0.12 | `secure-coding/no-missing-authentication` |
| 243 | 0.08 | `secure-coding/detect-non-literal-regexp` |

Three rules are 87% of the ecosystem's entire output.

`recommended` vs `recommended`: **us 1,059 findings, them 22,530** — 0.3 vs 7.4
per 1k LOC, at **28.6% vs 13.0%** sampled precision (n=24/side). With every rule
enabled: us 21,951, them 22,530.

## 4. Behavioural probes — §B and §C

`npx tsx scripts/rule-seal-probe.mts <plugin>/<rule>`

Nine checks that only appear when a rule RUNS, and that `rule-audit.ts` cannot
see because it reads source. Positive control first: each probe drives itself
from the rule's own `vulnerable/` fixtures, so a "quiet" verdict is never
reported without first proving the rule reports on that code.

| Rule | Probes | Tokens/finding (budget 120) | CVSS |
| :--- | :--- | ---: | :--- |
| `secure-coding/detect-object-injection` | **9/9** | 96 mean, 119 worst | 9.8 |
| `node-security/detect-non-literal-fs-filename` | **9/9** | 88 mean, 91 worst | 7.5 |
| `secure-coding/no-redos-vulnerable-regex` | **9/9** | 109 mean | 7.5 |
| `secure-coding/detect-non-literal-regexp` | **9/9** | 77 mean, 77 worst | 7.5 |

Covers: test-file self-skip (filename and path), deduplication, determinism,
stdout/stderr silence, schema-vs-`defaultOptions` drift, token budget, CVSS
spread, and §C2.4 false-positive guidance.

## 5. Test and coverage state

| Package | Tests | Coverage |
| :--- | ---: | :--- |
| `eslint-plugin-secure-coding` | 3,200 | 100% |
| `eslint-plugin-node-security` | 2,688 | 100% |
| `@interlace/eslint-devkit` | 1,721 | 100% |

---

## What this table does not say

- **Three of the four rules are not sealed.** `no-redos-vulnerable-regex` ships
  at `error`, where the bar is ≥95%, and is unscored. The two opt-in rules have
  no floor to clear, which is not the same as being good.
- **117 of 121 rules have never been measured per-rule on real code.** They are
  unscored, not passing.
- **We label our own findings.** Every label carries its file, line and reason so
  a reader can disagree and recompute. It is not independent review.
