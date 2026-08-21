# Re-reviewing every rule — the batch plan

Measured 2026-08-20 with `scripts/preset-sweep.mts` over the 20-repository
corpus (21,394 files, 3.10M lines) and cross-referenced against
`scripts/corpus-scan.ts`.

## Why batches, and why this order

409 rules cannot be reviewed one at a time — tonight's rate was roughly one
rule per hour once measurement, fix, lock test and real-source verification are
counted. Ordering by **what a user actually sees** finishes most of the value
in the first two batches.

The corpus scan currently gates **five security plugins**. Everything else is
ungated, and the ungated set produces **279,580 of 280,409 findings — 99.7%**.
The gate covers 0.3% of the experience.

## The batch procedure

Identical every time, and proven on `detect-child-process` and
`detect-non-literal-fs-filename`:

1. Add the plugin to `PLUGINS` in `scripts/corpus-scan.ts`.
2. Run the scan. Unbudgeted rules are allowed **zero** findings, so every rule
   that fires shows up.
3. For each rule that fires, **read the actual finding**. Decide: rule is wrong,
   or budget should be raised deliberately.
4. Fix the rule, or raise the budget in the same commit that explains why.
5. Lock every fix with a test that FAILS on the unfixed rule.

Rule of the batch, learned the hard way: **over budget is a question, not a
verdict.** An exemption that looks obvious can be a true positive — see
`.claude` memory `over-budget-is-not-a-false-positive`, where recursive `mkdir`
turned out to make the TOCTOU worse, not safer, and the existing lock test was
the only thing that caught it.

## Batches

| # | plugin(s) | rules | findings | share |
|---|---|---|---|---|
| **0** | the 8 already over budget in the existing gate | 8 | — | in-flight |
| **1** | `reliability` | 3 | 158,757 | 57% |
| **2** | `import-next` | 12 | 60,500 | 22% |
| **3** | `conventions` | 5 | 33,712 | 12% |
| **4** | `maintainability` | 3 | 14,770 | 5% |
| **5** | `modernization`, `operability`, `modularity` | 11 | 10,016 | 3.6% |
| **6** | `react-a11y`, `react-features` | 19 | 1,445 | 0.5% |
| **7** | security long tail — mongodb, lambda, knex, vercel-ai, nestjs, postgresql, mysql | 31 | 380 | 0.1% |

Batches 1–4 are **96%** of everything a user sees, in 23 rules.

## Batch 0 — DONE. Gate green, 42 findings → 36.

The gate is green in the sense that matters: `scripts/corpus-scan.ts` exits 0,
every rule is at or under its budget, and no rule is unbudgeted. It is NOT a
claim that every remaining finding is one a maintainer would act on — eight
rules still carry a budget above zero, and each budget records why in the
`triage` key of `.agent/corpus-findings-budget.json`.

Every one read in the target's own source before a verdict. **Three rule bugs
fixed, and one reversal.**

| rule | verdict |
|---|---|
| `node-security/no-timing-unsafe-compare` | **FIXED** — a route is not a credential |
| `browser-security/no-insecure-redirects` | **FIXED** — a reload is not a redirect |
| `secure-coding/no-sensitive-data-exposure` | **FIXED** 6 → 2 — prose naming a credential is not a leak of one; the 2 left are real |
| `node-security/no-toctou-vulnerability` | budget 1 — correct; my exemption was backwards |
| `browser-security/no-unencrypted-transmission` | budget 1 — a parse, but exempting loses recall |
| `browser-security/no-eval` | budget 1 — `eval(data)` on a network fetch, the strongest TP here |
| `node-security/require-dependency-integrity` | budget 3 — three CDN links with no SRI |
| `node-security/require-stream-error-handler` | budget 4 — all four TRUE, see triage; the handler is on the wrong stream |
| `node-security/no-unsafe-buffer-alloc` | budget 3 — `new Array(wireLength)` in ioredis; measured, weak threat model |
| `secure-coding/no-redos-vulnerable-regex` | budget 7 — oracle-confirmed; 2 are degree-2 effective FPs, kept because the CWE corpus pins that class |

Every budget carries its reasoning in the `triage` key of the budget file.

### What the batch taught

**Two of the five "obvious false positives" were true positives**, and in both
cases the obvious read was the wrong one:

- recursive `mkdir` makes the TOCTOU **worse**, not safer — the exemption was
  written and reverted, caught by the rule's own pinned corpus test
- `error-page.ts` really does load a CDN stylesheet; my grep for external URLs
  missed it because the href is an interpolated constant, and the rule did not

**Two fixes were declined on the rule's own documented reasoning.**
`no-unencrypted-transmission` would lose `new URL(...)` → `connect(u)` recall;
`no-sensitive-data-exposure` already closes `VALUE_FREE_PROPERTIES` as a
`@protocol-constant` and says opening it would let `.value` in. Budgeting is
the right answer when the rule has already had the argument.

## Batch 1 is blocked on a product decision

`reliability/no-missing-null-checks` is 56% of everything, at `warn` in
`recommended`. Two shape fixes shipped in #586 and removed 10%. The rest is not
a bug: the rule reports any dereference it cannot prove non-null, which in
untyped JavaScript is most dereferences.

An evidence gate — report only where the file itself null-checks, optional-
chains or defaults the same binding — was prototyped and reverted: it removed
23%, not the 93% a regex probe had predicted, because the two measured
different populations (first identifier *token* vs resolved *binding*), and it
does not apply at all to call-rooted chains like `expect(err).to.be`.

So the question is whether this rule belongs in `recommended` at all, not which
shape to special-case next. That is Ofri's call and it gates the batch.
