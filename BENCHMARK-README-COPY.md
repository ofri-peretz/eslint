# README copy — root repo and per-plugin

Paste-ready. Every number here is measured and reproducible; sources in
[BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md).

**Division of labour.** The root README carries the ecosystem story and the cross-plugin
scorecard. A plugin README carries *that plugin's* numbers only — never ecosystem totals. A
reader who lands on `eslint-plugin-node-security` from npm should learn what those 42 rules
do, not that the ecosystem has 121.

Keep the existing brand furniture (dual-logo header, logo row, closing mark). This replaces
the prose between them.

---

## Root README

### Headline

> # The security layer for ESLint
>
> **121 rules across 75 CWEs. Free, offline, zero-config.**
> 100% drop-in parity with `eslint-plugin-security` — measured against its own test suite.

```bash
npm i -D eslint-plugin-secure-coding eslint-plugin-browser-security eslint-plugin-node-security
```

### Why

**Noise creates apathy, and an ignored tool has zero recall.**

The community ESLint security category is five or six part-maintained plugins that each cover
a slice and overlap unpredictably. The most-installed one produces **87% of its output from a
single rule** — 20,334 of 23,325 findings across 20 open-source projects — and a hand-read of
that rule found 0 of 4 samples to be real defects.

The normal outcome is a team installs one, drowns, and switches the category off. A security
tool that gets switched off protects nothing.

We exist so that a security finding is worth reading.

### How

**Signal density is the design constraint, not an outcome.**

- **A rule earns its place by precision, not coverage.** A class we cannot detect precisely, we
  do not ship a rule for.
- **Every recall gap is measured before it is accepted or closed.** When we found a real
  300-file gap in regex construction, we built the fix, measured it at **29 → 2,243 findings
  and ~25% precision**, and reverted it. The gap is documented, not hidden.
- **Precision is published, including when it is unflattering.** Ours is **47%** on real
  open-source code. That is not a good number. It is our number, and the trend is in the open.

Measured across 20 projects and 2.37M SLOC, same sampling method applied to both sides:

| | Interlace | eslint-plugin-security |
|---|---|---|
| Findings | 981 | 21,557 |
| Measured precision | **47%** | 20% |
| **Noise per 1k SLOC** | **0.22** | 7.27 — **33× more** |
| **Findings read per real issue** | **2.1** | 5.0 |

They find more real issues in absolute terms — 4,311 to our 461 — because they fire 22× more
often. We think you read two findings to get one, not five.

### What

**One dependency replaces the category.** Measured against five community security plugins on
the same labelled corpus, same harness, same day:

| Plugin | TP | FP | FN | F1 |
|---|---|---|---|---|
| **Interlace** | **69** | **0** | **0** | **100%** |
| eslint-plugin-sonarjs | 27 | 9 | 42 | 51.4% |
| eslint-plugin-security | 10 | 7 | 59 | 23.3% |
| @microsoft/eslint-plugin-sdl | 6 | 2 | 63 | 15.6% |
| eslint-plugin-no-unsanitized | 4 | 1 | 65 | 10.8% |
| eslint-plugin-security-node | 4 | 3 | 65 | 10.5% |

Every vulnerable fixture any of the five detects, we detect — verified fixture by fixture,
zero exceptions — plus 42 that none of them find.

- **121 rules · 75 CWEs · 87 configurable · 64 with automated fix suggestions**
- **8.5 OpenSSF Scorecard**, including a clean Vulnerabilities check
- **Built to be read by your agent** — 419 structured message IDs, machine-readable CWE/OWASP
  metadata, and a documentation page for every rule
- **MIT, no telemetry, no network at lint time, no account**

### Boundaries

These define the product; they are not caveats attached to it.

- **This is the linter layer, not SAST.** No inter-procedural dataflow, no cross-file taint, no
  build integration, no SBOM, no secret-history scanning.
- **75 CWEs**, of roughly 900 — the ones an AST can see.
- **~47% precision on real code.** Roughly half of findings need triage today.
- **"Quieter" is measured against `eslint-plugin-security`.** Against a narrow single-purpose
  plugin we report more, and we say so.

[Full benchmark →](./BENCHMARK-RESULTS.md) · [Methodology and exact rule lists →](./BENCHMARK-METHODOLOGY.md) · [Raw data →](./benchmarks/results/published/benchmark-2026-08-14.json)

---

## Per-plugin README

Same three-part shape, scoped to the plugin. Template below; substitute the plugin's own
measured numbers.

### Headline

> # eslint-plugin-node-security
>
> **42 security rules for Node.js.** Subprocesses, filesystem paths, crypto, dependencies.
> Free, offline, zero-config.

### Why — one paragraph, plugin-specific

Name the defect class this plugin exists for, and the failure mode of the alternatives *in
that class*. For `node-security`: shell command injection and path traversal are the two
highest-severity defects a Node service carries, and the common rules for them either fire on
every `child_process` import or miss `exec('cmd ' + arg)` entirely.

### How — the same three commitments, one line each

Precision over coverage · every recall gap measured · precision published.

### What — this plugin's numbers only

| | |
|---|---|
| Rules | 42 (30 in `recommended`) |
| CWEs | 29 |
| Configurable | 32 |
| With fix suggestions | 21 |
| Documentation | 42/42 rules |

Then the rule table, install, and config — as today.

**Do not put in a plugin README:** ecosystem totals (121 rules, 75 CWEs), the six-plugin
leaderboard, or the cross-plugin scorecard. Those belong at the root. A plugin README that
claims the ecosystem's numbers reads as inflated the moment someone counts the rule table.

---

## Adjustments to existing READMEs

1. **Lead with the category claim, not the rule count.** "121 security rules" is a fact;
   "the security layer for ESLint, 100% parity with the incumbent" is a position.
2. **Add the Boundaries block.** Currently absent everywhere. It is what makes the F1 table
   read as research rather than marketing.
3. **Publish the 47%.** A maintainer who hits an unmentioned false positive closes the PR; one
   who was told where the line is keeps the plugin.
4. **Replace any unqualified "faster" or "quieter".** Throughput is ~2×, wall-clock is slower
   because we run 121 rules to their 14, and "quieter" holds only against
   `eslint-plugin-security`.
5. **Link the raw JSON**, not just the write-up. Pinned commits for all 20 repos are what make
   it checkable rather than assertable.
6. **Scope each plugin README to its own numbers.** Check for ecosystem totals that have leaked
   into individual plugin READMEs.
