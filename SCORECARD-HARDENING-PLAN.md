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

**Root cause found — it was never about the link syntax.** The autolink theory was
wrong: the links had already been rewritten as bare URLs on `main`, and the warning
survived. Reproduced against live `main` with the official container
(`gcr.io/openssf/scorecard:stable`), so it was not a stale alert either.

Scorecard resolves the policy file in two independent steps, and they disagreed:

1. `isSecurityPolicyFilename` matches the **full path** against a fixed list
   (`security.md`, `.github/security.md`, `docs/security.md`, …). Only the root
   `SECURITY.md` qualified — which is why the report *named* the right file.
2. The **content** is then fetched via `OnMatchingFileContentDo` using that path as
   a glob. `isMatchingPath` tries the full path and, failing that, retries against
   `path.Base(fullpath)` — so the pattern `security.md` matches *any* `security.md`
   at *any* depth. `checkSecurityPolicyFileContent` parses the first non-empty match
   and returns `false` ("stop looking").

The repo contained `.agent/agents/security.md`, an agent persona doc. It sorted
ahead of the root file, so Scorecard scored `SECURITY.md` against *that* file's
text: **0 URLs, 0 emails, 8 occurrences of "vuln"/"disclos"** — precisely the
finding set reported (text and disclosure hits, no linked content).

Fixed by renaming it to `.agent/agents/security-expert.md`. Locked by
`scripts/__tests__/security-policy-filename-lock.test.ts`, which asserts that
exactly one tracked file carries a Scorecard policy basename and that the root
`SECURITY.md` still satisfies Scorecard's own URL and email regexes. Verified to
fail on the pre-fix tree, naming the offending path.

Worth noting for our own rules: this is a **silent** scoring failure. Nothing
errored, no file was missing, and the reported filename was correct — only the
parsed bytes came from somewhere else.

### 3. Fuzzing: 0 → 10 · **+0.56** · ~~one day~~ **done, in an afternoon**

The one-day estimate assumed ClusterFuzzLite. It was wrong about what Scorecard
detects: alongside OSS-Fuzz and `.clusterfuzzlite/`, the check recognises
**property-based testing**, and for TypeScript that means a direct import of
`fast-check`. Confirmed in `checks/raw/fuzzing.go` and then verified end-to-end
against the official container:

```text
score: 10 | project is fuzzed
  Info: TypeScriptPropertyBasedTesting integration found
```

`scripts/ilb-fuzz.ts` was the wrong base to build on: it is an LLM-driven
FP/FN candidate generator that needs `ANTHROPIC_API_KEY` and costs ~$10 a
fleet run. Useful, but it is not a fuzzer and cannot run in CI.

`scripts/__tests__/rule-fuzz.test.ts` is. It asserts one deliberately weak
property — **for any parseable program, linting terminates without throwing** —
across all 30 plugins with every rule enabled. Generation is biased toward
security-relevant shapes (sinks, optional chaining, spreads, computed members,
template literals) because uniform noise mostly produces syntax errors that
never reach rule code; the inputs that break rules are *valid* programs with an
unusual AST.

This earns its place independently of the score. A rule that throws takes the
whole ESLint run down — the user stops linting altogether, which is issue #514's
failure mode, and we ship 409 rules.

Two guards keep the harness from going quietly vacuous, both asserted in the
file itself: a deliberately throwing rule must propagate out of `linter.verify`
(so the harness can fail at all), and the generator must produce findings
against a real plugin (so it cannot drift into emitting inert code). Runs in
~3s, inside `npm run test:scripts`, which `quality.yml` already executes.

**Not a substitute for ClusterFuzzLite**, which would fuzz continuously with
coverage guidance and corpus retention rather than 25 fresh draws per plugin per
run. Revisit if crashes start appearing that this depth misses.

### 4. Branch-Protection: -1 → 10 · **+0.25** · 30 minutes

The check currently errors: _"some github tokens can't read classic branch
protection rules."_ `scorecard.yml:60` already reads
`secrets.SCORECARD_REPO_TOKEN || secrets.GITHUB_TOKEN` — the secret just isn't set.

Create a fine-grained PAT with `administration: read` + `contents: read` on this
repo, store it as `SCORECARD_REPO_TOKEN`, re-run the workflow.

⚠️ **Verify our protection rules score 10 before enabling this.** The check is
excluded today; turning it on at, say, 6 would _lower_ the aggregate. `main`
already requires up-to-date branches, resolved
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
`sdk-compatibility.yml`, `supply-chain-attestation.yml`
and the `Dockerfile`, and pin the `pip` install in `codecov.yml`.

**Status — done except one, which is deliberately left open.**

Closed: `weekly-benchmark.yml` (`npm install` → `npm ci` against its committed
workspace lockfile), the `Dockerfile` (manifest + lockfile moved to `docker/image/`,
installed with `npm ci`; verified by building both `linux/arm64` and `linux/amd64`
and by the image's own in-container selftest), and `codecov.yml` (`pip3 install
codecov-cli` → `--require-hashes -r .github/requirements/codecov-cli.txt`, verified
to install and run `codecovcli 11.3.1` under Python 3.12).

**Closed 2026-08-13: `@cyclonedx/cyclonedx-npm` in `supply-chain-attestation.yml`**
(Scorecard alert #1326). Installed globally at `@4.2.1` — a version tag, not a
pin, since the transitive tree still resolved at install time. Now `npm ci`
against a committed lockfile in `.github/deps/cyclonedx/`, in its own directory
so it cannot touch the root lockfile and so a CI-only tool stays out of the
published graph.

Bumped `4.2.1 → 6.0.1` in the same change, because the lockfile is the point —
committing 4.2.1's would have published its transitive advisory into
Vulnerabilities. Measured: **4.2.1 → 1 high, 6.0.1 → 0**. Flags are unchanged
across the major and lowercase `json` is still accepted despite the help text
listing `JSON`; verified by generating a valid CycloneDX 1.6 document first.

**Open and won't-fix: `npm install -g @lhci/cli@0.14.0` in `lighthouse.yml`**
(Scorecard alert #1304). Pinning it means committing a lockfile, and OSV reads
committed lockfiles whether the tree is dev or prod.

Re-measured 2026-08-13, and the conclusion holds — the numbers have only got
worse with age:

| version | advisories | high |
| --- | ---: | ---: |
| `@lhci/cli@0.14.0` (current) | 12 | 5 |
| `@lhci/cli@0.15.1` (latest) | 10 | 7 |

There is still no release that avoids them, so this trades one **medium**
Pinned-Dependencies alert for ten findings on **Vulnerabilities**, a
higher-weighted check. The exposure is identical either way — the global install
runs the same code — so pinning moves vulnerabilities into view without removing
any.

The one route that would close it without that cost is replacing the global
install with a SHA-pinned `treosh/lighthouse-ci-action`: Scorecard counts a
hash-pinned action as pinned, and the action's transitive tree never enters our
lockfiles. Not done here because it is an unverifiable-in-review rewrite of a
working job — the report step reads `apps/docs/.lighthouseci` and the
issue-filing step depends on `lhci`'s outcome, and neither can be exercised
without a built docs site and Chrome. Worth doing deliberately, with a run to
prove it, rather than as a drive-by.

### 7. SAST: 9 → 10 · **+0.06** · a judgement call

CodeQL runs on the T3 promote gate and a weekly cron, deliberately — it costs ~4
min/run in a repo where roughly 82% of CI wall-clock is already queue,
not compute. Scorecard wants it on every commit.

**Superseded — this is now done.** The original recommendation was *don't*: 0.06
points is not worth adding a 4-minute job to every push in a repo that is already
queue-bound.

Two things changed it. First, scope: the trigger added is `push: branches: [main]`,
not every push on every branch — it fires once per merge, not once per commit on a
feature branch, so the cost is a few runs a day rather than one per push. Second,
the gap was never only about frequency. CodeQL fired solely on `pull_request`, so a
commit that reached `main` outside that path — automation commits, changeset
releases, anything merged while the PR was still a draft without `run-full-ci` —
was never analysed at all. That is not a tuning choice, it is a hole: the last
Scorecard run measured 25 of 30 commits analysed.

The `concurrency` block had to change with it. It was keyed on `github.ref` with
`cancel-in-progress: true`, so two merges landing close together would cancel the
first commit's analysis and leave it permanently unscanned — recreating the gap.
Push events are now keyed on `github.sha` and never cancelled; PR pushes still
supersede each other as before.

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

| Scenario                                    | Numerator | Denominator |    Result |
| :------------------------------------------ | --------: | ----------: | --------: |
| Today                                       |     612.5 |          90 |   **6.8** |
| Items 1–6 (no Code-Review, no Contributors) |       870 |        97.5 | **≈ 8.9** |
| …plus Code-Review                           |       945 |        97.5 | **≈ 9.7** |

The denominator moves from 90 to 97.5 in rows 2 and 3 because item 4 makes
Branch-Protection scoreable, adding its weight of 7.5 to both sides. That is
why enabling it is worth only +0.25 rather than a full 7.5/90 — and why
enabling it while the check would score badly is actively harmful.

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
- **`SECURITY.md` supported-versions table was wrong** — fixed alongside this plan. It claimed "1.x supported, < 1.0 unsupported" across a monorepo whose packages range from 0.1.4 to 8.3.5.
