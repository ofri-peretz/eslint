# Where the benchmark gets published, and what becomes an article

Decisions, not options. Source data:
[BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md) ·
[BENCHMARK-ARTICLE-QUEUE.md](./BENCHMARK-ARTICLE-QUEUE.md) ·
`benchmarks/results/published/benchmark-2026-08-14.json`

---

## 1 · Where the results live

Four surfaces, each with one job. The rule is that **numbers have exactly one home** and
every other surface links to it.

| Surface | Carries | Why there |
|---|---|---|
| **`BENCHMARK-RESULTS.md`** (repo) | the canonical scorecard, all 52 criteria, tiers, caveats | The source of truth. Every other surface links here rather than restating figures — restated numbers drift, and this repo has already lost one section to that |
| **Root `README.md`** | the doctrine, the six-plugin table, the real-source precision table, "What this is not" | The first thing a maintainer reads. Already shipped in this PR |
| **`eslint.interlace.tools/benchmarks`** | the same tables, rendered, plus the raw JSON download | Citable from outside GitHub. Needs a page; the JSON is already committed |
| **Dev.to** | the articles below | Reach. Never the canonical numbers — always a link back |

**Do not** put the numbers in individual plugin READMEs. A plugin README carries that
plugin's own rule count and CWE coverage; ecosystem totals there read as inflated the moment
someone counts the rule table.

---

## 2 · Is it a blog post? Yes — but not one

One post cannot carry this without becoming a 6,000-word artefact nobody finishes. It is
**five posts**, and the order matters more than the content.

### The sequence

**1 · T1 — "Our security rule fired on a Zod schema"** *(self-criticism first)*

`no-xpath-injection` reported `export const QueryValidateSchema = QueryInputSchema` and
stayed **silent** on `xpath.select("//user[@id='" + id + "']", doc)`. A false positive and a
false negative in the same rule, found by hand-reading our own output on 20 open-source
projects.

Ends with the measured precision — **47%** — stated plainly.

*Why first:* leading with a competitor's 87%-one-rule number reads as a hit piece. Leading
with our own broken rule earns the right to publish it. This is the post that makes the next
four credible.

**2 · T1 — "Four ways ESLint told me a benchmark passed when it had measured nothing"**

The methodology piece, and the most broadly useful thing here — it applies to anyone
benchmarking a linter, not just security.

1. `lintText` with a `filePath` outside cwd returns *"File ignored because outside of base
   path"* and zero findings — **scored 0/76 for both sides and read as a clean tie**
2. Flat config lints only `**/*.js` without an explicit `files` pattern, so every `.ts` is
   silently skipped — in an ecosystem that is majority TypeScript
3. A stale `dist/` measured 3.3.2 while the published package was 4.1.0
4. `spec/` directories linted as production code — one repo's findings fell 300 → 26

*Why second:* establishes that we know how to measure before we publish measurements.

**3 · T0 — "Noise creates apathy"** *(the doctrine — the flagship)*

The one to spend real effort on. 981 findings at 47% precision against 21,557 at 20% —
**2.1 findings read per real issue versus 5.0**, and **33× less noise per 1k SLOC**.

The turn that makes it a T0 rather than a T1: **we tested the doctrine against ourselves and
it cost us.** A real ~300-file recall gap in `no-unsafe-regex-construction`, the fix built and
measured at **29 → 2,243 findings / ~25% precision**, and reverted.

And the honest half: **they find 4,311 real issues to our 461.** More coverage, far more
noise. The question the piece leaves the reader with is which of those two tools is still
switched on in six months.

*Why T0:* it is a position, not a finding. It is the thing to be known for, it does not
expire when a version bumps, and every subsequent benchmark post can reference it.

**4 · T1 — "87% of a security plugin's output is one rule"**

`security/detect-object-injection`: **20,334 of 23,325 findings** across 2.37M SLOC. Every
other rule in the plugin combined is 0.6%. Then the hand-read — `modelOrConn[modelSymbol]` (a
**Symbol** key, cannot reach a prototype), `lines[i]`, `adapters[i]`,
`allowedAlgorithmsForKeys[keyType]` — **0 of 4 sampled were real**.

*Framing:* about a rule, not about people. No maintainer is named. The finding is that a rule
this dominant has stopped being a rule and become a default.

**5 · T1 — "We measured six ESLint security plugins on the same corpus"**

The leaderboard as the anchor piece, with the corpus, runner and fixtures public. Ships with
its caveat in the body, not a footnote: **the fixtures are ours**, so it is a regression gate
as much as a ranking — and the independent number is the 51/51 on the competitor's own suite.

---

## 3 · Tier calls, and why

| Piece | Tier | Reasoning |
|---|---|---|
| Noise creates apathy | **T0** | A durable position, not a dated measurement. Does not expire on a version bump; every later benchmark post cites it |
| Zod schema self-criticism | T1 | Concrete, dated, specific — high trust, but it stops being interesting once fixed |
| Four silent-zero traps | T1 | Broadly useful and evergreen-ish, but it is a technique post, not a stance |
| 87% one rule | T1 | Strong, but it is *their* number. A position built on a competitor's defect is borrowed, not owned |
| Six-plugin leaderboard | T1 | The reference table. Needs re-running to stay true, so it dates |

**One T0 only.** The doctrine is the only piece here that is still true in two years. Filing
more than one as T0 devalues the tier.

---

## 4 · Rules that apply to all five

Carried from [BENCHMARK-CRITERIA.md](./BENCHMARK-CRITERIA.md) §D:

- **Name the version.** `eslint-plugin-security@4.0.1`, `secure-coding@4.1.0`. A comparison
  against an unnamed version is unfalsifiable and therefore worthless.
- **Ship the command.** Every number gets the one-liner that reproduces it.
- **Publish the number that hurts** next to the one that helps. Our 47% precision, their
  higher absolute true-positive count, and that "quieter" holds only against
  `eslint-plugin-security` — against `eslint-plugin-no-unsanitized` we report *more*.
- **Link, do not restate.** Canonical figures live in `BENCHMARK-RESULTS.md`.
- **No maintainer is named.** The subject is always a rule or a method.

---

## 5 · Sequencing against the release

The plugin fixes in this PR change the numbers, so publish **after** the release lands, not
before — an article citing 47% while npm still ships the old false positives is a broken
claim on day one.

Order: merge → release → re-run `ilb-real-source` → confirm the published figures → then
piece 1.
