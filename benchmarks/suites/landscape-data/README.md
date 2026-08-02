# ILB-Landscape — license freedom matrix + maintenance velocity

Measurements **H#32** (license freedom matrix) and **H#33** (maintenance velocity)
of the security-benchmark leadership plan. Two artifacts, one suite:

1. **`harvest.mjs`** — deterministic, $0, re-runnable harvest of public npm +
   GitHub facts for every tool in the pinned competitor registry
   (`eslint-security-leadership/conditions/competitors.json`, registryVersion
   1.0.0) **plus the 10 Interlace security plugins**, run through the exact
   same code path with zero special-casing. Output is an append-only dated
   snapshot at `benchmarks/results/landscape-data/<date>.json` in the standard
   ILB result envelope (`bench: "ILB-Landscape"`).
2. **`citations.md`** — the license freedom matrix. Judgment cells (free for
   private repos, offline-capable, no code upload, OSI-approved) are each
   backed by a **verbatim quoted clause + source URL + retrieval date**.
   Facts and quotes only; no characterization of vendor intent.

## Pre-registered metric definitions (H#33)

Frozen in the harvest-script header **before the first run**; changing any
definition bumps `benchVersion`. Summary:

| Metric | Definition |
|---|---|
| npm releases / 12 mo | registry `time` map entries ≥ run-date − 365d (deprecations not excluded — the registry does not date them; same rule for everyone) |
| GitHub releases / 12 mo | non-draft Releases with `published_at` ≥ run-date − 365d; prereleases included |
| Median first-response | Issues opened in trailing 24 months (≤1000 most recent, truncation recorded): hours to first comment by MEMBER/OWNER/COLLABORATOR that is not a bot and not the issue author. Median + p90 + n + response rate |
| Monorepos | measured at repo level, flagged `repoLevel: true` |

## Honesty guardrails

- **eslint-plugin-security is NOT dormant** — 2 npm releases in the trailing
  12 months (4.0.0 2026-02-19, 4.0.1 2026-06-12). Only the pre-registered
  metrics above are reported; no "dormant/abandoned" narrative.
- Our own repo runs through the same queries and filters; if a number
  embarrasses us it ships with a footnote, not an exclusion.
- Big-vendor tools (CodeQL / Snyk / Sonar) are expected to win raw velocity —
  that is a pre-registered honest loss on those rows.
- License matrix phrasing: state what a document **says**, never what a vendor
  intends. Ambiguity is reported as "unclear — see clause", never resolved in
  our favor. Not legal advice.

## Run

```bash
npm run ilb:landscape          # requires authenticated gh CLI; ~2 min, $0
node benchmarks/suites/landscape-data/harvest.mjs --force   # redo today's snapshot
```
