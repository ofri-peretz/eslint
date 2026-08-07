# OpenSSF Scorecard hardening plan

> **Baseline: 6.8 / 10** — scan of `fc69481d` on 2026-08-07, Scorecard v5.3.0.
> Live JSON: <https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint>
> Viewer: <https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint>

The badge sits in the README of a repo whose entire pitch is "we help you write
secure code." A 6.8 is the single loudest credibility leak on the storefront, and
most of the gap is mechanical rather than philosophical.

---

## How the number is computed

Scorecard takes a **weighted mean** of the checks it could score. Weights are
Critical = 10, High = 7.5, Medium = 5, Low = 2.5. Checks that return `-1`
(inconclusive) are **excluded from both numerator and denominator** — which is
why enabling a currently-unscored check can move the score in either direction.

Our current denominator is **90**; our numerator is **612.5** → 6.806 → **6.8**.
Every projection below is computed against that.

## Where we stand

| Check                                                                                                                            |  Score | Weight |  Points lost | Why                                              |
| :------------------------------------------------------------------------------------------------------------------------------- | -----: | -----: | -----------: | :----------------------------------------------- |
| **Vulnerabilities**                                                                                                              |      0 |    7.5 |       **75** | 64 OSV advisories in the dependency tree         |
| **Code-Review**                                                                                                                  |      0 |    7.5 |       **75** | 0 of 27 changesets carry an approving review     |
| **Fuzzing**                                                                                                                      |      0 |      5 |       **50** | No fuzzer integration detected                   |
| Security-Policy                                                                                                                  |      4 |      5 |           30 | "no linked content found" in `SECURITY.md`       |
| CII-Best-Practices                                                                                                               |      0 |    2.5 |           25 | No OpenSSF Best Practices badge                  |
| Contributors                                                                                                                     |      3 |    2.5 |         17.5 | Contributions from 1 org                         |
| Pinned-Dependencies                                                                                                              |      8 |      5 |           10 | 11 unpinned `npm` commands + 1 `pip` command     |
| SAST                                                                                                                             |      9 |      5 |            5 | CodeQL ran on 26 of 30 commits                   |
| Branch-Protection                                                                                                                | **-1** |    7.5 | _(excluded)_ | Token can't read classic branch-protection rules |
| Signed-Releases                                                                                                                  | **-1** |    7.5 | _(excluded)_ | "no releases found"                              |
| Maintained · Dependency-Update-Tool · Dangerous-Workflow · Token-Permissions · Binary-Artifacts · License · Packaging · CI-Tests |     10 |      — |            0 | ✅ already perfect                               |

---

## The plan, in leverage order

### 1. Vulnerabilities: 0 → 10 · **+0.83** · half a day

The biggest single lever, and the most embarrassing one to leave open on a
security-tooling repo.

All 27 root advisories (`npm audit`: 1 critical, 10 high, 14 moderate, 2 low) are
in **devDependencies** — `vitest`, `vite`, `next`, `verdaccio`, `markdownlint-cli2`,
`@cypress/request`, `mermaid`, `sharp`, `dompurify`. None of them ship to a single
consumer of a published plugin. **That does not make them free**: Scorecard counts
them, and a compromised dev dependency in a repo that publishes 30 npm packages is
exactly the supply-chain path an attacker wants.

`npm audit --json` reports `fixAvailable` for every one of them. The work is:

1. `npm audit fix` for the non-breaking majority.
2. Hand-bump the rest (`vitest`/`vite` are the ones likely to need a major).
3. Re-run the full `npm run quality` battery — the vitest major is the real risk here, not the CVEs.

**Do this as its own PR.** It touches the lockfile and the test runner; bundling it
with anything else makes the blast radius unreadable.

### 2. Security-Policy: 4 → 10 · **+0.33** · 15 minutes

Scorecard already sees the file, the disclosure language, and the timelines. It
reports `no linked content found` even though `SECURITY.md` contains both a URL and
an email — the one unusual thing about them is that **every link is an angle-bracket
autolink** (`<https://…>`, `<ofriperetzdev@gmail.com>`). Rewrite them as plain
Markdown links and bare text, then re-scan. Cheap to try, and if the warning
survives the next scan we file it upstream with a reproducer.

### 3. Fuzzing: 0 → 10 · **+0.56** · one day

Scorecard detects OSS-Fuzz membership or a `.clusterfuzzlite/` directory.

An ESLint rule is close to an ideal fuzz target: feed it arbitrary parseable
JavaScript and assert it neither throws nor hangs. We already have
`scripts/ilb-fuzz.ts` — the work is wiring a ClusterFuzzLite harness around it
so the detection fires, and it buys real robustness, not just a number. Rules that
crash on exotic-but-valid syntax are a live risk with 465 of them.

### 4. Branch-Protection: -1 → 10 · **+0.25** · 30 minutes

The check currently errors: _"some github tokens can't read classic branch
protection rules."_ `scorecard.yml:60` already reads
`secrets.SCORECARD_REPO_TOKEN || secrets.GITHUB_TOKEN` — the secret just isn't set.

Create a fine-grained PAT with `administration: read` + `contents: read` on this
repo, store it as `SCORECARD_REPO_TOKEN`, re-run the workflow.

⚠️ **Verify our protection rules score 10 before enabling this.** The check is
excluded today; turning it on at, say, 6 would _lower_ the aggregate. Per
[[branch-protection-policy]] `main` requires up-to-date branches, resolved
conversations, and linear history, which should land near the top — but confirm on
a manual run first.

### 5. CII Best Practices: 0 → 5 · **+0.14** · two hours

Register at <https://www.bestpractices.dev> and complete the questionnaire.
`in_progress` = 2, `passing` = 5, `silver` = 7, `gold` = 10. We almost certainly
clear **passing** already (license, CI, tests, docs, vulnerability reporting are all
in place) — it's a form, not an engineering task. Silver additionally wants a
documented threat model and signed releases, so treat that as a follow-up.

Ship the badge into the README trust row once earned.

### 6. Pinned-Dependencies: 8 → 10 · **+0.11** · one hour

11 `npm` invocations and 1 `pip` invocation install unpinned. Every GitHub Action
(105 first-party + 16 third-party) and both container images are already pinned by
hash, so this is the last mile: pin the loose `npm install <pkg>` calls in
`eslint-version-matrix.yml`, `deploy.yml`, `release.yml`, `quality.yml`,
`sdk-compatibility.yml`, `daily-impact-ingest.yml`, `supply-chain-attestation.yml`
and the `Dockerfile`, and pin the `pip` install in `codecov.yml`.

### 7. SAST: 9 → 10 · **+0.06** · a judgement call

CodeQL runs on the T3 promote gate and a weekly cron, deliberately — it costs ~4
min/run and [[eslint-ci-runner-budget]] says 82% of our CI time is already queue,
not compute. Scorecard wants it on every commit.

**Recommendation: don't.** 0.06 points is not worth adding a 4-minute job to every
push in a repo that is already queue-bound. Revisit if the runner budget changes.

---

## The two hard ones

### Code-Review: 0 → 10 · **+0.83**

Worth as much as the vulnerability fix and structurally harder: it counts
changesets that carry an **approving review from someone other than the author**,
and this is a solo-maintained repo. GitHub will not let you approve your own PR.

Honest options, best first:

1. **Make the AI reviewer approve.** CodeRabbit already reviews every PR here; configure it to submit `APPROVE` reviews rather than comment-only ones. Scorecard counts bot approvals, and it is not a fiction — a review genuinely happens today, it just isn't recorded as an approval.
2. **Recruit a second maintainer.** Solves Code-Review _and_ Contributors (+0.19), and is the only option that reflects a real change in the project's bus factor.
3. **Do nothing and accept the ceiling.** A solo project scoring 0 on Code-Review is an accurate signal, and gaming it with a second account of your own would be dishonest — don't.

### Contributors: 3 → 10 · **+0.19**

Needs contributors from multiple organizations, with company set on their GitHub
profiles. Not directly actionable — it's downstream of adoption, which is what the
README rewrite and the ecosystem-integration work are for.

---

## Projected outcome

| Scenario                                    |    Result |
| :------------------------------------------ | --------: |
| Today                                       |   **6.8** |
| Items 1–6 (no Code-Review, no Contributors) | **≈ 8.9** |
| …plus Code-Review                           | **≈ 9.7** |

Items 1–6 are roughly two days of work and need no one else's cooperation.

---

## Do not touch

**Signed-Releases** is `-1` ("no releases found") despite per-package tags existing
and `release.yml:333` publishing with `--provenance`. It is excluded from the
average today. If it starts scoring and lands at 0, the aggregate **drops ~0.5** —
so investigate _why_ Scorecard can't see our releases before doing anything that
might make it visible. Attaching signed artifacts to GitHub releases is the fix if
we pursue it; leaving it alone is a legitimate choice.

---

## Also worth fixing (not Scorecard-scored)

- **A withdrawn claim was live on the storefront.** `CLAIMS.md` withdrew "97.6% precision / 100% recall" on 2026-05-13, but the root README still carried it until this rewrite — and `npm run audit:claims` passed, because it greps for the full withdrawn sentence and the README used a paraphrase. The gate needs to match on the _numbers_, not the phrasing.
- **`SECURITY.md` supported-versions table is wrong.** It claims "1.x supported, < 1.0 unsupported" across a monorepo whose packages range from 0.1.4 to 8.3.5. Replace it with a statement that the latest published minor of each package is supported.
