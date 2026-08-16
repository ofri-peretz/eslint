# Benchmark criteria — what we measure, why, and what may be published

**Created:** 2026-08-13
**Companion to:** [BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md](./docs/planning/BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md) (results) and [PERFECTION-PLAN.md](./PERFECTION-PLAN.md) (open work)

This file defines the criteria. The results file reports them. Keep them separate — a
criterion that gets rewritten to match a result it produced is not a criterion.

Section C is unusual and is the reason this file exists separately: it scores the plugin's
**output as consumed by an AI agent**, which is now a primary consumer of lint output and
is not represented in any existing lint benchmark.

---

## 0. Rules that govern every criterion

1. **Every published number carries the command that reproduces it.** A figure with no
   committed runner is not a measurement. This cost us the entire 8-repo noise section,
   whose clones are gone and whose numbers cannot be re-derived.
2. **Both sides run identically.** Same file set, same preset tier, same parser, same
   exclusions. Any asymmetry is a defect in the harness, not a result.
3. **Precision and recall are measured in the same session.** A precision sweep that is
   not paired with a recall gate will trade one for the other silently — it already has,
   twice.
4. **Silence is not precision until proven.** A zero is a finding about the harness until
   shown otherwise. Three separate runs today reported clean zeros that were ESLint
   skipping files (`.ts` with no parser, paths outside cwd, no `files` pattern).
5. **The corpus is an instrument.** Changing a fixture restates every number derived from
   it. Fixture edits are allowed only when the fixture is provably wrong, and must be
   called out in the same commit.

---

## A. Run-level criteria (the end-to-end benchmark)

### A1. Detection — requires labelled ground truth

| Criterion | Definition | Instrument |
|---|---|---|
| **TP rate** | vulnerable fixtures where the *topically correct* rule fires | `benchmarks/corpus`, Juliet |
| **TP rate (any-rule)** | vulnerable fixtures where *any* rule fires | same — **upper bound only** |
| **FN rate** | `1 − TP` | labelled corpora only |
| **Competitor parity** | their `invalid` cases we detect, weighted by declared won't-fix | `ilb-competitor-parity` |

**Report both TP variants, always.** Any-rule scoring inflated our corpus score by 4 files
today — all four were credited to `no-missing-authentication` firing on unrelated Express
boilerplate, with no rule actually detecting the CWE under test. Attribution-correct TP is
the honest number; any-rule is the ceiling.

**FN on unlabelled real source is not measurable.** Do not derive, estimate, or publish it
from a repo scan. Only labelled corpora and CVE-anchored checkouts produce a real FN.

### A2. Precision — three tiers, never conflated

| Tier | What it measures | Where it is valid |
|---|---|---|
| **Fixture FP** | fires on `safe/` files we authored | proves the rule handles the documented safe pattern. **Says nothing about real code** |
| **Sampled FP** | hand-labelled sample of real-source findings, stratified by repo and rule, with n and CI stated | the honest real-world number |
| **Provable-FP floor** | mechanically-verifiable non-defects (numeric indices, loop counters, ALL_CAPS keys) | a lower bound, never a rate |

A fixture-FP of 0/67 measured on 67 fixtures we wrote ourselves is a regression gate, not a
marketing claim. Label it as such wherever it appears.

**Sampling protocol:** ≥20 findings per side, stratified across repos and across the top 5
rules by volume, each labelled TP / FP / undecidable with a one-line reason. Report the
undecidable count — a high one means the message failed to explain itself (see C3).

### A3. Volume — reported, never scored as quality

Finding counts on real source measure volume. **Quieter is better only if the extra
findings are wrong**, which requires A2. Report:

- total findings, both sides
- **findings per 1,000 LOC** (not per file — file size varies 100× across repos)
- per-repo table, plus `louder on N of M repos`
- top 10 rules by volume, both sides

Never publish a volume ratio without the sampled-FP number beside it.

### A4. Performance

| Criterion | Definition | Note |
|---|---|---|
| **Throughput** | (rules enabled × files linted) ÷ seconds | **The criterion.** Only size-normalised metric available |
| Wall-clock | total lint time | Caveat, not a criterion — compares 14 rules against 121 |
| **ms per rule per file** | via ESLint `stats: true` | Identifies the rule paying for everyone else |
| Peak RSS | max resident set | Matters on CI runners |
| Cold vs warm | first run vs cached | Users feel cold |

**Report throughput as a range, not a point.** Two runs of the same script on the same
corpus disagreed by 15%. Three significant figures on a 164-file corpus is false precision.

### A5. Corpus hygiene — a gate on the run itself, not a score

The run is **invalid**, not merely unflattering, if any of these fail:

- [ ] Every intended file was actually linted (no silent `ignored` messages)
- [ ] `.ts`/`.tsx` collected **and** parsed — the ecosystem is majority TypeScript
- [ ] Test directories excluded: `test`, `tests`, `__tests__`, **`spec`**, `e2e`, `benchmark`, `fixtures`
- [ ] Vendor/minified excluded by path **and** by average line length
- [ ] Resolved package versions printed; local `dist/` is a hard failure without an explicit flag
- [ ] Both sides on the same preset tier (`recommended` vs `recommended`)

Each of these has produced a wrong published number in this repo at least once.

---

## B. Rule-level criteria

Applied per rule, not per plugin. A plugin's score is the distribution, not the mean —
one rule at 24 false positives is worse than twenty rules at one.

### B1. Correctness

- **Mutation-verified.** Reverting the rule turns a test red. A fix with no failing-on-broken-code test is half-done.
- **No lock test pins a defect.** A test asserting the buggy behaviour is worse than no test. Today: one asserted a template literal with no format specifier must report CWE-134; another asserted `app.use(middleware)` is a route handler.
- **Deduplicated.** One defect, one finding. Four rules firing on one `http://` string is one defect reported four times. Same-line duplicates are a bug.
- **Evidence-gated where the sink is an SDK.** A rule for a library must confirm the file uses that library.
- **Loopback and reserved names exempt.** `localhost`, `127.0.0.1`, `::1`, and RFC 2606 domains (`example.com`, `.test`, `.invalid`) are not endpoints.
- **Self-skips test files** — by path and by filename (`*.spec.*`, `*.test.*`), independent of the harness.

### B2. Configurability

- Non-empty `meta.schema`, with defaults that are **safe in the common case**. An empty default `ignorePatterns` on a rule that flags every route means every consumer inherits the noise.
- Every option documented with its measured effect. `reportUnresolvedPaths` carrying "measured at 7% precision" is the standard — it tells the reader the cost.

### B3. Hygiene

- **Never writes to stdout or stderr.** A `console.log` in a rule corrupts the JSON and SARIF formatters. This shipped to npm and is how it was found.
- Deterministic: same input, same findings, same order.
- No network, no filesystem writes, no environment reads at lint time.

---

## C. Feedback quality — the plugin's output as read by an AI agent

**Why this section exists.** A large and growing share of lint output is now consumed by a
model, not a human: an agent reads the finding and edits the code. That consumer has
different needs from an IDE squiggle, and no existing lint benchmark measures it. This is
the most defensible differentiator we have, because the competitor scores zero on most of
it by construction.

Scored by having a model act on findings **without access to the rule's documentation** —
the message is all it gets.

### C1. Machine-actionability

| Criterion | Why it matters to a model |
|---|---|
| **Structured `messageId`** | Lets an agent group, count and route findings without parsing prose. 419 vs 0 |
| **Machine-readable taxonomy** (CWE, OWASP) in `meta`, not only in the string | An agent filtering by CWE must not regex the message |
| **Precise node range** | A whole-statement range forces the agent to re-derive which sub-expression is wrong |
| **`hasSuggestions`** | A structured edit beats prose describing an edit. 64 vs 0 |
| **Deterministic ordering** | Non-determinism breaks diffing between runs |

### C2. Does the message say what to change?

Ranked by what actually helps an agent produce a correct patch:

1. **The specific expression at fault** — not "user input detected" but which argument.
2. **Why it is unsafe here** — the property that makes it exploitable, so the agent can tell whether a proposed fix removes it.
3. **The fix, as code** — `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` beats "use a timing-safe comparison".
4. **What a false positive looks like** — a sentence naming the safe pattern lets an agent close a finding instead of "fixing" correct code. Nothing in either plugin does this today. **Biggest available win.**

### C3. Measurable feedback metrics

Run a model over a fixed sample of findings, message only:

| Metric | Definition | Target |
|---|---|---|
| **Actionability** | % where the agent produces a patch that removes the finding *and* passes tests | ≥80% |
| **Localisation** | % where the agent edits the right expression first try | ≥90% |
| **FP-recognition** | % of known-FP findings the agent correctly declines to "fix" | ≥70% |
| **Undecidable rate** | % where the message is insufficient to act | ≤10% |
| **Tokens per finding** | message length in tokens | ≤120 |
| **Signal density** | actionable tokens ÷ total tokens | ≥0.6 |

### C4. What is currently wrong with our messages

Observed directly while consuming several thousand of them today:

- **Severity is uncalibrated.** `CVSS:9.8` on a missing-auth-middleware finding, and on
  object injection, and on command injection. If everything is 9.8, the field carries no
  information and an agent cannot triage. **Fix: real per-rule CVSS, or drop the field.**
- **Emoji prefixes** (`🔒`, `⚠️`) cost tokens and carry nothing machine-readable.
- **Interpolated data is truncated mid-token.** `Route handler missing authentication
  check: use(` — the `{{route}}` value was the literal string `use(`. Worse than omitting it.
- **Everything is one flat string.** CWE, OWASP, CVSS, description, severity and fix are
  concatenated with `|` and `Fix:`. An agent must parse prose to get fields that should be
  in `meta`.
- **No FP-recognition guidance anywhere.** No message tells the reader what a legitimate
  version of the flagged pattern looks like.

### C5. Where we already win, and it is worth saying

Their plugin has **0 messageIds, 0 suggestions, 0 configurable rules, 0 CWE tags in rule
metadata**, and ~60-character inline strings. Ours: 419 messageIds, 64 suggestion-providing
rules, 87 configurable, 75 CWE identifiers, 216-character messages averaging 6,410 bytes of
docs per rule against their 546.

That gap is real, structural, and not something a 14-rule plugin closes incrementally.

---

## D. Publication rules — what may be said, and where

### D1. Claim tiers

| Tier | Backing required | Where it may appear |
|---|---|---|
| **Publishable** | committed runner + real source we did not author + sampled FP with n | README, articles, PRs to maintainers |
| **Internal** | committed runner, self-authored corpus | this repo, CI gates, planning |
| **Not yet a claim** | no runner, or unreproduced | nowhere outside a plan file |

Today's `0/67` fixture-FP is **Internal**. The 20-repo volume table becomes **Publishable**
only once A2 sampling is attached.

### D2. Every claim carries its caveat in the same sentence

Not a footnote. `"6.6× fewer findings across 20 projects (24,078 files) — volume, not
precision; see the sampled FP rate"` is publishable. `"6.6× quieter"` is not.

### D3. Where results land

| Surface | What goes there |
|---|---|
| **Plugin READMEs** | that plugin's rule count, CWE coverage, its own FP/TP, install size. Not ecosystem totals |
| **Root README** | the cross-plugin scorecard, OpenSSF score, headline detection and precision, one line per criterion with a link here |
| **This file** | criteria only |
| **Results file** | numbers + provenance + caveats |

### D4. Marketing statements this benchmark can support

Strongest first. Each is one command from being falsified, which is the point.

1. **"Every rule ships a CWE identifier, a configurable schema, and a structured message ID. The incumbent ships none."** 121/121 vs 0/14. Structural, verifiable in ten seconds, and unarguable.
2. **"Built to be read by your agent, not just your IDE"** — 64 suggestion-providing rules, 419 message IDs, machine-readable taxonomy. Section C is a category nobody else measures, and we would be defining it.
3. **"8.1 vs 6.8 on OpenSSF Scorecard, including a clean Vulnerabilities check."** Third-party scoring, no interpretation needed.
4. **"96% drop-in parity with `eslint-plugin-security`, measured against their own test suite"** — with the won't-fix classes named.
5. **Volume claims — only after A2.**

**Do not claim** speed unqualified, "quieter" without sampled FP, or any coverage number
that depends on plugins outside the set being compared.

### D5. Fix-and-rerun loop

A defect found by this benchmark is not closed until: fix → lock test that fails on the
unfixed code → precision **and** recall gates rerun in the same session → results file
updated → CI ratchet updated so it cannot silently return.
