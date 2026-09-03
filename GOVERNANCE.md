# Governance

> **Status.** v1, drafted 2026-05-09.
> **Scope.** This document covers project-wide governance — who can land what, how disagreements get resolved, how project-wide direction is set. **Corpus governance is separate** — see [`benchmarks/audits/2026-05-09-corpus-governance.md`](benchmarks/audits/2026-05-09-corpus-governance.md), which establishes a 3-steward voting model for the bench corpus specifically (independent of project governance to remove the "tool author owns the test" conflict).

## 1. Roles

### 1.1 Maintainer

**Today**: Ofri Peretz, sole maintainer.

Responsibilities:

- Sets the strategic direction (the [`LEADERSHIP_ROADMAP.md`](benchmarks/LEADERSHIP_ROADMAP.md))
- Has merge rights on the main branch
- Decides which contributions land + which don't
- Manages npm publish keys + GitHub repo permissions

**Future**: as the project grows, additional maintainers will be added per §3 below.

### 1.2 Contributors

Anyone who opens an issue, PR, or discussion. No formal status required.

### 1.3 Corpus stewards (separate)

A 3-person body with a non-Interlace majority that votes on changes to the public bench corpus. **Independent of project maintenance** to remove the conflict-of-interest charge that any vendor-self-published benchmark faces. Defined in [`benchmarks/audits/2026-05-09-corpus-governance.md`](benchmarks/audits/2026-05-09-corpus-governance.md).

## 2. Decision-making

### 2.1 What needs explicit approval

| Change kind | Requires |
| :--- | :--- |
| Bug fix, doc improvement, test addition | 1 maintainer review |
| New rule (within an existing plugin) | 1 maintainer review + passing CI gates (smoke + promotion-gate + validate-results) |
| New plugin or new bench | Issue first to discuss scope; then PR with 1 maintainer review |
| Severity promotion `warn → error` | Promotion-gate enforcement (mechanical: ≥ 4 fixtures + ≥ 90 days Wild + 95% precision) + 1 maintainer review |
| Breaking API change in a published package | Maintainer + minor SemVer bump + CHANGELOG entry |
| New principle in `benchmarks/README.md` §1 | Maintainer + open discussion in an issue for ≥ 7 days before merging |
| Corpus change (fixtures, CWE additions, scoring formula) | **Per the corpus governance doc** — 2/3 corpus stewards + 7-day notice |
| Public bench publication (e.g. major leaderboard release, OWASP submission) | Maintainer + named external reviewer when available (Cohen's κ pipeline) |

### 2.2 What doesn't need approval

- Editorial fixes to docs that don't change semantics
- CI / tooling changes that don't affect bench results
- Cosmetic refactors of internal code

The maintainer can land these directly.

### 2.3 Disagreement resolution

If a maintainer and contributor disagree on a non-trivial change:

1. **Try once on the PR** — clear written reasoning from both sides.
2. **Escalate to an issue** — visible to the wider community.
3. **Maintainer decides** — and writes the rationale in the issue. The contributor is welcome to fork.

If a contributor believes the maintainer made the wrong call repeatedly, they can fork and run their own derivative; the MIT license guarantees it.

## 3. Adding new maintainers

The project grows past one maintainer when a contributor:

1. Has merged ≥ 10 substantive PRs over ≥ 6 months
2. Demonstrates judgment on at least one contentious decision (severity promotion, methodology change, corpus expansion)
3. Is nominated by an existing maintainer + approved by 2/3 of existing maintainers (1 today, so just the existing one)

A new maintainer gains: merge rights on main, ability to publish under `@interlace/*`, voice on roadmap direction.

## 4. Conflicts of interest

- **Maintainers and corpus stewards must disclose** any commercial interest in a SAST tool (employment, advisory role, equity).
- **Corpus stewards must not be employed by Interlace or by a direct SAST competitor** — see corpus governance doc.
- **Project maintainers may have commercial interest in Interlace** (it's the project), but must recuse from any decision that creates an unfair advantage over a peer SAST tool participating in the public benchmark.

## 5. Funding + commercial use

- Interlace is MIT-licensed and free for any use, commercial or not.
- The maintainer may take consulting / training / hosted-leaderboard revenue without affecting the open-source project.
- The bench corpus + scoring tooling will not be paywalled or gated. Ever. If that changes, this doc changes first with a 90-day notice.
- Sponsorship is not currently set up; if it is in the future, it goes through GitHub Sponsors and is publicly disclosed.

## 6. Communication channels

- **GitHub Issues** — bugs, feature requests, design discussions
- **GitHub Discussions** (if enabled) — open-ended conversation
- **Pull requests** — code review + targeted decisions
- **Security disclosures** — see [SECURITY.md](SECURITY.md)
- **Code of conduct violations** — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

There is no Slack/Discord today. If demand justifies it, a Discord server may be added — coordinated through an issue first.

## 7. Roadmap + priorities

The strategic roadmap lives in [`benchmarks/LEADERSHIP_ROADMAP.md`](benchmarks/LEADERSHIP_ROADMAP.md). The maintainer drives prioritization. Phase items are open to community contribution; community-proposed new phases get added by amending that doc through a normal PR.

Live status (machine-readable) lives in [`benchmarks/state.json`](benchmarks/state.json) — query it with `jq` instead of grepping markdown.

## 8. License + copyright

All contributions are MIT. The DCO requires `Signed-off-by:` on every commit (per CONTRIBUTING.md). Copyright stays with the original author; no CLA assignment.

## 9. Amendment

This document changes by a normal PR with maintainer approval. Significant changes (new maintainer rules, corpus-governance interaction, funding rules) require ≥ 7 days of public discussion before merging.

---

*Inspired by the OpenSSF Best Practices governance template, the Node.js project governance model, and the OWASP Project Lifecycle. Adapted for a small-project-with-public-benchmark shape.*
