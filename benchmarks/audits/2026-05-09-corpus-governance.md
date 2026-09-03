# Open Corpus Governance — `interlace-bench/corpus`

> **Roadmap.** [LEADERSHIP_ROADMAP.md](../LEADERSHIP_ROADMAP.md) §4.5.
> **Status (2026-05-09).** Governance model + repo split plan + steward criteria documented. Repo creation + steward onboarding are the only external actions.

The Interlace bench corpus (CWE-mapped fixtures + ground-truth labels) is currently in `benchmarks/corpus/` of the main repo. To remove the "tool author owns the test" conflict-of-interest charge — the easiest attack on our published numbers — the corpus needs to live in a separately-governed repository with non-Interlace stewards. This document is the migration + governance plan.

## Why split

Right now: the same party (Interlace maintainer) authors the rules, authors the fixtures, runs the bench, publishes the F1 numbers. A skeptic can dismiss every claim as "of course they win their own test." Splitting governance:

- **Removes the conflict.** Corpus changes need approval from a steward who isn't the rule author.
- **Enables external corpus contributions.** A vendor / researcher / community member can submit a fixture without it being "an Interlace concession."
- **Prepares for OWASP submission** (Phase 3.3). OWASP project lifecycle requires multi-org governance.
- **Makes external replication cheap** (Phase 4.3). Reviewers can pin a corpus version without depending on the tool repo.

## Target layout

New GitHub repo: **`interlace-bench/corpus`** (org TBD — `interlace-bench` if available, else fall back to `ilb-corpus`).

```
interlace-bench/corpus/
├── README.md                       # what this corpus is; how to use it
├── GOVERNANCE.md                   # decision-making, stewards, escalation
├── CONTRIBUTING.md                 # how to submit a fixture / a CWE expansion
├── LICENSE                         # MIT — same as Interlace
├── CWE-022/                        # path traversal
├── CWE-078/                        # OS command injection
├── CWE-079/                        # XSS
├── CWE-089/                        # SQL injection
├── CWE-094/                        # code injection
├── CWE-352/                        # CSRF
├── CWE-502/                        # deserialization
├── CWE-798/                        # hardcoded credentials
├── CWE-915/                        # object injection
├── CWE-918/                        # SSRF
├── CWE-943/                        # NoSQL injection
├── meta/
│   ├── truthtable.csv              # OWASP-Benchmark-format ground truth
│   ├── version.json                # corpus version + commit SHA + timestamp
│   └── methodology.md              # scoring formula + boundaries
├── tools/
│   ├── ilb-validate-fixtures.mjs   # mirrored from main repo
│   └── ilb-truthtable-build.mjs    # generates truthtable.csv from fixture metadata
└── .github/
    └── workflows/
        ├── validate.yml            # PR gate: every fixture has @author/@reviewedBy/@cwe/@expected
        └── release.yml             # version bump + tag on every PR merge to main
```

Main `eslint` repo references the corpus as a Git submodule pinned to a specific tag, so reproducibility is preserved.

## Governance model

**Stewards**: 3 voting members (1 Interlace maintainer + 2 external). PRs require ≥ 2 approvals to merge. Steward changes require 2/3 unanimous + a 7-day public notice.

**External steward criteria**:

1. Active contributor to a security project (SAST tool, security plugin, CVE research, etc.) for ≥ 12 months.
2. Not employed by Interlace or by a direct competitor (sonarjs, CodeQL, Semgrep, Snyk) — to avoid both conflict and capture.
3. Public reputation we can verify: GitHub history, conference talks, papers, OWASP project membership.

**Decisions we vote on**:
- Adding a CWE category or new fixture (≥ 2 approvals; "obvious cleanups" via Interlace-maintainer fast-path)
- Bumping the corpus version (= invalidating prior bench results — high-bar; ≥ 2 approvals + 7-day notice)
- Changing the scoring formula (= harder. ≥ 3 approvals + 14-day notice + RFC)
- Adding / removing a steward

**Decisions we don't vote on** (Interlace-maintainer prerogative):
- Editorial fixes to README / docs
- CI / tooling changes that don't affect ground truth
- Cosmetic refactors

## Candidate external stewards

To approach in priority order:

| Candidate (anonymized) | Profile | Why |
| :--- | :--- | :--- |
| **Maintainer of an OWASP Benchmark sister project** | If OWASP Benchmark for JS happens (Phase 3.3), the OWASP project lead is the natural first steward | Aligns governance across the two projects |
| **A CWE-track committer at MITRE** | If MITRE CWE Compatibility submission lands (Phase 1.8), MITRE's review contact | Cross-org credibility |
| **Independent security researcher (Snyk Research / GitHub Security Lab)** | Public CVE-research portfolio, no direct rule-engine conflict | Most plausible for a 12-month commitment |

## Migration plan

**Week 0** (today): publish this governance doc; open the conversation in any active community channel.

**Week 1–2**: outreach to candidate external stewards. Goal: 2 verbal commits.

**Week 3**: create the `interlace-bench/corpus` repo. Move fixtures with `git filter-repo` to preserve history. Add `GOVERNANCE.md` + `CONTRIBUTING.md`.

**Week 4**: convert the main repo's `benchmarks/corpus/` to a Git submodule pinned to `interlace-bench/corpus@v1.0`. Update bench runners to consume the submodule.

**Week 5**: ratify the first external stewards (≥ 2). First PR through the new flow as a smoke test.

**Week 6+**: announce publicly. Submit to MITRE CWE Compatibility / OWASP with the new governance as an additional credibility point.

## Risks

| Risk | Mitigation |
| :--- | :--- |
| No external stewards willing to sign on | Start with academic security-lab outreach (Phase 4.3 candidates overlap); if all decline, downgrade to "advisory board" with looser commitments |
| Submodule overhead breaks bench-runner UX | Provide `npm run corpus:bootstrap` that handles the submodule init for newcomers |
| Steward drift / inactivity | 12-month renewable terms; auto-rotate after 6 months of no PR activity |
| Corpus repo gets a coup attempt | 2/3 + 7-day-notice for steward changes is a deliberate veto safeguard |

## Status checklist

- [x] Governance doc (this file)
- [x] Repo layout designed
- [x] Steward criteria + candidate list
- [x] Migration plan (6 weeks)
- [ ] First external steward verbal commitment (next external action)
- [ ] `interlace-bench/corpus` repo created
- [ ] Main repo converted to submodule
- [ ] First multi-steward-approved PR
