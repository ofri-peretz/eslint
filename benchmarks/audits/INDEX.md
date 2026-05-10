# `benchmarks/audits/` — Index

> Dated point-in-time audits, readiness packets, and outreach drafts. **This folder is append-only**: published audits stay; superseded ones get a status flag, not a deletion. The most recent live state always lives in [`benchmarks/state.json`](../state.json) and [`benchmark-results/scorecard.md`](../../benchmark-results/scorecard.md), not here.

## Status legend

- 🟢 **Live** — actively referenced; consult before related work
- 📤 **Ready to send / file** — drafted; needs a human action (form fill, email, recording) to execute
- ✅ **Executed** — outreach sent / form filed / packet shipped; archived for history
- 🟡 **Superseded** — replaced by a newer doc; kept for traceability
- 📝 **Reference** — historical / point-in-time snapshot, not load-bearing for current decisions

## Catalog

### Periodic audits — point-in-time bench reviews

| File | Status | What it is |
| :--- | :--- | :--- |
| [`2026-05-03.md`](./2026-05-03.md) | 📝 Reference | ILB audit, 2026-05-03 — names every known FP/FN, attributes each to a rule, produces a triage queue ranked by impact |
| [`2026-05-09.md`](./2026-05-09.md) | 📝 Reference | ILB audit — formatter + vocabulary + provenance iteration |

### Compliance & credibility — submission packets

| File | Status | What it is |
| :--- | :--- | :--- |
| [`2026-05-09-mitre-cwe-compatibility-readiness.md`](./2026-05-09-mitre-cwe-compatibility-readiness.md) | 📤 Ready to file | MITRE CWE Compatibility Program submission readiness — 8/8 criteria assessed; final form-fill awaits human action |
| [`2026-05-09-mitre-loom-storyboard.md`](./2026-05-09-mitre-loom-storyboard.md) | 📤 Ready to record | RR-2 demo recording script — 5 scenes, ~3.5 min total. Pairs with the readiness doc above |
| [`2026-05-09-runtime-support-policy.md`](./2026-05-09-runtime-support-policy.md) | 🟢 Live | Node.js + TypeScript support tier matrix; Node LTS schedule; industry distribution sources; refresh triggers. Consulted by ILB-Node-Matrix and ILB-TSC-Matrix |

### Public benchmark — leaderboard + protocol

| File | Status | What it is |
| :--- | :--- | :--- |
| [`2026-05-09-ilb-submission-protocol.md`](./2026-05-09-ilb-submission-protocol.md) | 🟢 Live | Public submission protocol for the ILB Public Leaderboard. Anyone can submit a SARIF run on the canonical corpus and land a row |

### Outreach drafts — pitches awaiting send

| File | Status | What it is |
| :--- | :--- | :--- |
| [`2026-05-09-owasp-benchmark-pitch.md`](./2026-05-09-owasp-benchmark-pitch.md) | 📤 Ready to send | OWASP Benchmark for JavaScript — full project proposal: governance, corpus expansion plan, 8-week outreach plan, backup plan if OWASP declines |
| [`2026-05-09-outreach-owasp-slack.md`](./2026-05-09-outreach-owasp-slack.md) | 📤 Ready to send | Copy-pasteable OWASP Slack post + email-fallback contact protocol + 5-point talking-points + 3-criteria success metric |
| [`2026-05-09-outreach-snyk-semgrep.md`](./2026-05-09-outreach-snyk-semgrep.md) | 📤 Ready to send | Differential co-publication outreach — adaptable email template per recipient (Semgrep / Snyk / GitHub Security Lab); fit analysis + per-target specifics + backstop |
| [`2026-05-09-conference-talk-submissions.md`](./2026-05-09-conference-talk-submissions.md) | 📤 Ready to submit | Talk drafts for USENIX Security '27 / OWASP Global '27 / BlackHat Arsenal USA '27 / ICSE '28 — title + abstract + checklist + timeline per venue |

### Replication & governance — scientific rigor

| File | Status | What it is |
| :--- | :--- | :--- |
| [`2026-05-09-external-replication-kit.md`](./2026-05-09-external-replication-kit.md) | 📤 Ready to send | Reproducibility kit for an independent reviewer to re-run ILB-Arena + ILB-Juliet on independent infrastructure. Candidate reviewer list (NCC Group / CMU CyLab / MITRE), engagement template, comparison flow via Cohen's κ |
| [`2026-05-09-corpus-governance.md`](./2026-05-09-corpus-governance.md) | 📤 Ready to execute | Open corpus governance plan — split fixtures into `interlace-bench/corpus` org with non-Interlace majority steward council. 6-week migration plan. Resolves "tool author owns the test" conflict |

### Forward-looking — academic publication

| File | Status | What it is |
| :--- | :--- | :--- |
| [`2026-05-09-paper-draft.md`](./2026-05-09-paper-draft.md) | 🟢 Live (in-progress) | Academic paper outline + abstract. Target: USENIX Security '27 → ICSE '28 backup. 8-section outline + 6-figure plan + author placeholder + pre-submission checklist |

## How to update this index

When you add a new audit doc:

1. **Date-prefix the filename**: `YYYY-MM-DD-<topic>.md`. Same-day docs differentiate via `<topic>` (e.g. `2026-05-09-mitre-loom-storyboard.md`).
2. **Add a row to the relevant section above** with status flag + one-line description.
3. **Never delete an audit.** Mark it 🟡 Superseded if a newer one obsoletes it; keep the file for traceability.
4. **When an action executes** (form filed, email sent, recording posted), flip the flag from 📤 → ✅ and add the destination link (Loom URL, OWASP issue link, npm package, etc.) inline.

## What lives elsewhere (not in this folder)

- **Live status** of every roadmap item → [`benchmarks/state.json`](../state.json)
- **Live numbers** (F1, ms/file, etc.) → [`benchmark-results/scorecard.md`](../../benchmark-results/scorecard.md) (regenerated)
- **The roadmap itself** → [`benchmarks/LEADERSHIP_ROADMAP.md`](../LEADERSHIP_ROADMAP.md)
- **Active FP/FN triage** → [`benchmarks/FP_FN_REMEDIATION_TRACKER.md`](../FP_FN_REMEDIATION_TRACKER.md)
- **Where to find any doc** → [`OVERVIEW.md`](../../OVERVIEW.md) at repo root
