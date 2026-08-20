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

## Batch 0 — the eight over budget now

Left red deliberately; blanket `--update` would bury whichever are real.

| rule | found | budget |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 7 | 6 |
| `secure-coding/no-sensitive-data-exposure` | 6 | 2 |
| `node-security/require-dependency-integrity` | 3 | 2 |
| `node-security/no-toctou-vulnerability` | 1 | 0 |
| `node-security/no-timing-unsafe-compare` | 1 | 0 |
| `browser-security/no-eval` | 1 | 0 |
| `browser-security/no-insecure-redirects` | 1 | 0 |
| `browser-security/no-unencrypted-transmission` | 1 | 0 |

`no-toctou-vulnerability` is **resolved: not a bug.** The finding is
okta-auth-js's `rollup.config.js` doing
`if (!existsSync(d)) mkdirSync(d, { recursive: true })`. An exemption was
written and reverted — with `recursive: true` an attacker who plants a symlink
in the window gets mkdir to succeed *silently* and later writes follow it.
Without the flag it throws EEXIST and the program notices. Its budget should be
raised to 1, not the rule changed.

`browser-security/no-unencrypted-transmission` is the next to look at:
ioredis's `lib/utils/index.ts:291` builds `new URL("redis://" + rawUrl)` — a
Redis connection string being *parsed*, flagged by a **browser** rule. Verify
before assuming; the TOCTOU case says the obvious read can be wrong.

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
