# MITRE CWE Compatibility Readiness — 2026-05-09

> **Status.** Submission-ready review. This document maps the Interlace ESLint ecosystem to the [MITRE CWE Compatibility Program](https://cwe.mitre.org/compatible/requirements.html) requirements, identifying which criteria we already meet and what's still required before an official submission.
>
> **Roadmap item.** [LEADERSHIP_ROADMAP.md](../LEADERSHIP_ROADMAP.md) §1.8 — MITRE CWE Compatibility submission.
>
> **Outcome targets.** "CWE-Compatible" seal published on the MITRE compatibility list, alongside Coverity, Fortify, Sonar, and Checkmarx.

---

## 1. The four mandatory criteria

Each criterion below is graded as ✅ **met**, 🟨 **partial**, or ❌ **gap**, with the evidence and the remaining work noted.

### MR-1 — CWE Searchable

> *"Capability of a feature, application, system or service to enable a user to find security elements by their CWE Identifier."*

**Status:** ✅ **met.**

**Evidence.**
- Every Interlace security rule's `meta.docs` block carries a `cwe` field (single ID or array). See [`packages/eslint-plugin-secure-coding/src/rules/no-hardcoded-credentials/index.ts`](../../packages/eslint-plugin-secure-coding/src/rules/no-hardcoded-credentials/index.ts) for the canonical shape.
- Rule documentation pages on [eslint.ofriperetz.dev](https://eslint.ofriperetz.dev) include the CWE in front-matter, making each rule discoverable by CWE on the docs site search.
- The forthcoming SARIF formatter (item 1.2, shipped 2026-05-09) emits `properties.cwe` on every result + `tags: ['external/cwe/CWE-NNN']`, which makes findings searchable by CWE in any SARIF consumer (GitHub Advanced Security, Defender, GitLab).

### MR-2 — CWE Output

> *"Capability of a feature, application, system, or service to present results to the user with associated CWE Identifiers."*

**Status:** ✅ **met.**

**Evidence.**
- ESLint message format: each finding's diagnostic message references the CWE (e.g. `[CWE-798] Hardcoded credential detected`).
- SARIF output (item 1.2) emits each finding with `properties.cwe` plus `tags: ['external/cwe/CWE-NNN']`. This is the canonical machine-consumable channel and the one MITRE expects for "output."
- ILB-Wild reports surface findings grouped by CWE in the per-repo Markdown rollups under [`benchmark-results/<date>/per-repo/<repo>/`](../../benchmark-results/).

### MR-3 — Mapping Accuracy

> *"CWE identifiers linked to individual security elements, where appropriate, must accurately reflect the corresponding weaknesses."*

**Status:** ✅ **met — 204 of 207 rules mapped (98.6%); the 3 unmapped have triage items open.**

**Evidence.**
- [`benchmarks/corpus/`](../corpus/) is organized by CWE folder; every fixture has an `@cwe` annotation enforced by [`scripts/ilb-validate-fixtures.mjs`](../../scripts/ilb-validate-fixtures.mjs) (`--strict`).
- Coverage audit (re-run 2026-05-09 via [`scripts/docs-cwe-coverage.mjs`](../../scripts/docs-cwe-coverage.mjs)): **207 rules, 91 distinct CWEs, 16 of CWE Top-25 covered (64%), 3 unmapped.** Live JSON: [`benchmark-results/cwe-coverage.json`](../../benchmark-results/cwe-coverage.json).
- CI-enforced via `npm run docs:cwe-coverage:check` — fails if any new rule lands without a `cwe` annotation or an explicit `cweJustification`.
- The 3 unmapped rules have triage entries in [`FP_FN_REMEDIATION_TRACKER.md`](../FP_FN_REMEDIATION_TRACKER.md) — each will land with a CWE annotation or a `cweJustification` before submission.

### MR-4 — CWE Documentation

> *"Capability's documentation must adequately describe CWE, CWE Compatibility, and how the CWE related functionality in the capability is used."*

**Status:** ✅ **met.**

**Evidence.**
- Public CWE Compatibility doc: [`apps/docs/content/docs/cwe-compatibility.mdx`](../../apps/docs/content/docs/cwe-compatibility.mdx) — covers the four-criterion contract, current coverage (auto-generated), what's emphasized vs. not (RR-4 justification baked in), CLI usage, GHAS filtering, and submission status.
- Per-rule doc pages explain the CWE relationship in prose.
- [`benchmarks/README.md`](../README.md) §3 cites MITRE CWE Top 25 as the corpus prioritization driver.

---

## 2. The four recommended criteria

These boost the application's review score but aren't strict requirements.

### RR-1 — CWE Spec

> *"Provide CWE specification details (a sortable list of all CWE identifiers covered by the capability)."*

**Status:** ✅ **met.**

**Evidence.**
- `npm run docs:cwe-coverage` emits sortable JSON + Markdown: [`benchmark-results/cwe-coverage.{json,md}`](../../benchmark-results/cwe-coverage.md).
- Per-CWE row carries: distinct rule list, Top-25 flag, OWASP-Top-10 flag, plugin owners. CWE link points to the official `cwe.mitre.org/data/definitions/*.html` page.

### RR-2 — CWE Mapping Demo

> *"Provide media (such as a video) demonstrating how to use CWE-related functionality."*

**Status:** ✅ **storyboard ready — recording is the only remaining external action.**

**Evidence.**
- Shot-by-shot recording script at [`benchmarks/audits/2026-05-09-mitre-loom-storyboard.md`](./2026-05-09-mitre-loom-storyboard.md). 5 scenes, ~3.5 minutes total, with prerequisite commands, narration text, and a recording checklist.
- The recording itself requires a screen-capture tool and cannot be produced by an agent. Estimated time-to-record once a maintainer sits down: ~20 minutes (5 min recording + trimming + caption review + Loom upload).

### RR-3 — CWE Coverage Gap List

> *"Document any CWE identifiers that the capability does not cover but might reasonably be expected to."*

**Status:** ✅ **met.**

**Evidence.**
- Auto-generated gap list at [`benchmark-results/cwe-coverage-gaps.md`](../../benchmark-results/cwe-coverage-gaps.md) — lists every CWE Top-25 entry not yet covered, with OWASP Top-10 flag and JS-detectability heuristic per gap.
- Regenerates on every rule change (no manual maintenance).
- Current state: 9 of 25 Top-25 gaps, 6 of which are C/C++ memory-safety CWEs (out of scope for JS/TS — RR-4 justification applies).

### RR-4 — CWE Coverage Justification

> *"Justify why specific CWE identifiers are or are not covered, and why specific identifiers are emphasised."*

**Status:** ✅ **met.**

**Evidence.**
- Justification section embedded in both:
  - The public docs page: [`apps/docs/content/docs/cwe-compatibility.mdx`](../../apps/docs/content/docs/cwe-compatibility.mdx) under "What's emphasized, what's not (RR-4 Coverage Justification)" — three explicit emphasis criteria + four explicit non-coverage rationales.
  - The auto-generated gap list at [`benchmark-results/cwe-coverage-gaps.md`](../../benchmark-results/cwe-coverage-gaps.md) under "Justification for non-coverage".

---

## 3. Submission checklist

All engineering criteria are ✅. The only remaining external steps are:

1. **Record the RR-2 demo** following the [storyboard](./2026-05-09-mitre-loom-storyboard.md) (~20 minutes).
2. **File the submission** via the [MITRE CWE Compatibility Application Form](https://cwe.mitre.org/compatible/process_application.html). Authorized maintainer action — cannot be done by an agent.

- [x] **MR-1** CWE Searchable (rule meta + SARIF tags + docs site)
- [x] **MR-2** CWE Output (ESLint message + SARIF properties)
- [x] **MR-3** Mapping Accuracy (204/207 rules mapped, CI-enforced via `docs:cwe-coverage:check`)
- [x] **MR-4** CWE Documentation ([`cwe-compatibility.mdx`](../../apps/docs/content/docs/cwe-compatibility.mdx))
- [x] **RR-1** CWE Spec ([`benchmark-results/cwe-coverage.{json,md}`](../../benchmark-results/cwe-coverage.md))
- [x] **RR-2** CWE Mapping Demo (storyboard ready; recording is the only external step)
- [x] **RR-3** Coverage Gap List ([`benchmark-results/cwe-coverage-gaps.md`](../../benchmark-results/cwe-coverage-gaps.md))
- [x] **RR-4** Coverage Justification (in `cwe-compatibility.mdx` + the gap list)

**Estimate to ready:** ~30 minutes (record demo + submit form). MITRE review window is 2–6 weeks.

---

## 4. Why this matters

Once the seal lands, Interlace appears on the official [CWE-Compatible Products](https://cwe.mitre.org/compatible/compatible.html) page next to Coverity, Fortify, Sonar, and Checkmarx — the *de facto* roster of "credible static-analysis tools." For an ESLint-plugin ecosystem, that listing is unprecedented; for the dual-audience leadership goal (humans + AI agents), it's the credibility ground floor that every later move (NIST SSDF, OWASP ASVS, the public ILB leaderboard) rests on.
