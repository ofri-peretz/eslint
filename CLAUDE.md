# CLAUDE.md — agent context for this repo

> **Read this first.** AI assistants (Claude, GPT, etc.) working in this repo
> should follow the conventions below. The broader playbook is in
> [AGENTS.md](./AGENTS.md) — release flow, branch protection, plugin scope,
> CI gates. This file captures the _behavioral_ contract on top.

---

## A QUIET probe proves nothing without a positive control

**Read this before you claim any rule is healthy.**

On 2026-08-16 sixteen rules were probed with benign snippets, all sixteen stayed
quiet, and the conclusion reported to the maintainer was "these rules are fine".
They were not. The snippets omitted the **sink**, so the rules were quiet for a
reason unrelated to the thing being tested. With the sink present, fifteen of the
sixteen fire on benign code:

```js
if (passengers.length >= 4) {
  bookGroupFare();
} // "Password length requirement is too weak"
console.log(device.microphoneEnabled); // "PII in console logs"      — phone ⊂ microphone
localStorage.getItem('recipe-casserole-draft'); // "Authentication logic in client code" — role ⊂ casserole
```

The protocol, every time:

1. **Positive control first.** Prove the rule REPORTS on the shape you are testing.
2. **Change one thing** — the spelling, the whitespace, the comment.
3. QUIET means something only if step 1 fired.

And always run the **false-negative direction**, which is the one nobody runs:
take genuinely vulnerable code, rename its identifiers to innocuous words, and
see whether detection dies. For all fifteen it did.

Probe with `npx tsx scripts/probe-rule.mts <plugin>/<rule> -- '<code>'`.

---

## A rule decides by evidence. Never by a name.

**This is the first rule in this file because it is the defect class that reaches
users.** People run these plugins in production. A rule that fires because a
variable is _spelled_ a certain way is a false positive in a stranger's codebase,
and a maintainer who gets one stops trusting the whole ecosystem — the README's
own FP/FN section explains exactly why that is fatal: an ignored tool has zero
recall regardless of what it detects.

**Forbidden in any reporting path:**

```ts
varName.includes('password'); // no
calleeName.includes(lib.toLowerCase()); // no
WORDS.some((w) => identifier.includes(w)); // no — including behind a helper
```

Real findings this shipped, every one a name match reporting on evidence it did
not have:

- `no-ssrf` treated any parameter containing `url`, `user`, `input`, `param`,
  `host`, `source`, `target` or `link` as attacker-controlled — so
  `function connect(hostname)` and `function build(params)` were tainted
- `no-xpath-injection` fired on `export const QueryValidateSchema = QueryInputSchema`
- `display-name` reported **every named component in every React codebase**
- `no-electron-security-issues` matched `'ui'` inside `benchmarks/s`**ui**`tes/`
- `no-http-urls` reported `indexOf('http://')` — the guard itself
- `require-secure-credential-storage` read `const key = fs.readFileSync('./ssl.key')`
  as a stored credential

**Use instead:** `isStaticExpression` for "can this change", scope analysis
(`getScope`, `getDeclaredVariables`) for "what does this binding actually resolve
to", and a proven sink for "does this value get there". Those are in
`@interlace/eslint-devkit` precisely so no rule has to guess from a name.

**Exact membership is not this.** `NAMES.has(node.name)` against a closed API
surface is fine. Substring matching is what is banned.

### The gate, and the two ways it has been defeated

`npm run lint:name-inference` fails the build on a new site and on a stale
registry entry. Both evasions have already happened, so check for them:

1. **Behind a helper.** The check was intra-procedural: one function returned the
   spelling, another substring-matched a word list against the string it was
   handed, and no `.name` appeared near the test. `credential-evidence.ts` shipped
   green that way. The gate now also flags a four-plus list of string literals fed
   to `.some(w => x.includes(w))`, which catches the shape wherever the haystack
   came from.
2. **Writing the exception into the gate's own doc comment.** That is
   _documenting_ a defect, not mitigating it, and it is explicitly not acceptable
   here. If a site is genuinely correct, register it with its direction and reason
   — do not annotate the gate to look past it.

**Direction matters when triaging.** A name match that SUPPRESSES (a
`trustedLibraries` allowlist) costs recall. A name match that REPORTS costs a
user's trust. Fix the reporting ones first.

Every fix here needs a lock test that fails on the unfixed rule, and the CWE
corpus recall gate re-run in the same session — precision work in this repo has
bought recall loss before.

---

## How work moves: the AI-native SDLC

The working model for this repo and every sibling is
`AI_NATIVE_SDLC.md`, which sits one level up beside this repo rather than inside it —
it governs every sibling repo, so it cannot live in any one of them, and a link from
here would dangle in a standalone clone. Six stages, each handing off through a
**committed Markdown artifact rather than a chat message**:

| Stage | Artifact | Here |
| :--- | :--- | :--- |
| 1 Plan | `intent.md` — what is wanted, why, under which constraints | [`intent/`](./intent/) |
| 2 Design | `spec.md` — requirements + design, committed beside the intent | [`intent/`](./intent/) |
| 3 Build | plan mode, this file, skills, worktrees | — |
| 4 Test | a one-command feedback loop, plus config evals | [`evals/`](./evals/) |
| 5 Deploy | AI review, hooks as gates, CI/CD | `.claude/hooks/release-gate.sh` |
| 6 Maintain | control bands; a breach writes a **new `intent.md`** | `scripts/control-bands.ts` |

What this means in practice:

- **Start substantive work from an `intent.md`.** See [`intent/README.md`](./intent/README.md).
  An `approved` intent with no `spec.md` beside it fails a lock — approving means
  designed, not liked.
- **A control band is not a threshold.** `scripts/control-bands.ts` applies Western
  Electric rules over a rolling mean and σ, so it sees slow drift and not just a hard
  break. 1σ logs, 2σ diagnoses read-only, 3σ may act. **Never widen a band to clear a
  breach** — a band widened to fit an excursion measures nothing afterwards.
- **A breach becomes an intent, not a ticket.** That is the loop. A GitHub issue is
  the separate queue the loop exists to avoid; issues are for a *watcher* breaking,
  which is an outage rather than a finding.
- **Editing `CLAUDE.md`, `AGENTS.md`, `.agent/**` or `lefthook.yml` is a configuration
  change** and runs [`evals/`](./evals/). Treat a pass-rate drop as a review blocker.
- **Releases ask.** `.claude/hooks/release-gate.sh` pauses a production deploy or an
  `npm publish` for a human. `RELEASE_APPROVAL=1` pre-approves a session.

What holds each column, with its cadence, is [`docs/DOCS_QUALITY.md`](./docs/DOCS_QUALITY.md).
A claim about the docs is worth exactly as much as the check that holds it.

---

## Regressions are the issue. Lock everything you fix.

A fix is **not done** until a test would have caught the bug pre-deploy.
The site is shipped by humans and agents in parallel — anything we don't
lock will eventually regress when a different agent (or a future you)
refactors nearby code without knowing the invariant.

When you fix a bug, ask:

1. **Could this have been caught by a unit / lock test?** If yes, add one
   in the same PR. The test must fail on the unfixed code and pass on
   the fix. Vitest under `apps/docs/src/__tests__/*-lock.test.ts(x)` is
   the canonical home for structural locks. See
   `apps/docs/src/__tests__/homepage-lock.test.tsx` for the pattern.
2. **Is this a content / data drift bug** (cached JSON, stale URL,
   external API contract shift)? Then the lock belongs alongside the
   sync script that produces the data — both a vitest structural check
   ("the JSON has the shape we expect") and a script-time live check
   ("the URL we're caching is 2xx right now"). See
   `apps/docs/scripts/sync-tweet-cache.ts` + the regression-lock test
   in `apps/docs/src/__tests__/social-embeds-integrity.test.ts` for the
   reference pair.
3. **Is this a visual regression at a specific viewport?** Mobile widths
   are the most regression-prone surface — they are visited least often
   in dev and stack components into the longest scroll. Reproduce at
   ~390px width before claiming a fix; re-screenshot after.

The default question for every change in this repo is: _"if I revert
the fix, would CI go red?"_ If the answer is no, the fix is half-done.

### Why this matters here

This is a published ESLint ecosystem. The docs site is the storefront.
Silent visual regressions (broken images, empty hero cards, dark-mode
contrast loss) directly impact trust and adoption, and they ship
unattended via the manual `deploy-docs.yml` flow — no PR preview will
flag a stale cached URL or a missing image binding. Locks are the only
mechanism that scales with both human contributors and AI agents
making concurrent changes.

### Tested locks in this repo (extend, don't bypass)

- **Homepage structure** — `src/__tests__/homepage-lock.test.tsx`
  pins required imports, required sections (HERO / STATS / PILLARS /
  SOCIAL PROOF / WHAT IT CATCHES / etc.), and forbidden patterns
  (open-coded section wrappers, `max-w-*` ad-hoc widths).
- **Layout primitives** — `src/__tests__/layout-primitives-lock.test.tsx`
  enforces LAYOUT_PHILOSOPHY.md (4 containers, 6-step spacing).
- **Social embeds / cache** —
  `src/__tests__/social-embeds-integrity.test.ts` validates every
  cached tweet has a preview-image URL when its `card` field is
  present, and the dev.to / tweet cache files cover every embed
  referenced in source.
- **Tweet cache HEAD-check** — `scripts/sync-tweet-cache.ts` HEADs
  every cached `card.binding_values.photo_image_full_size_large` URL
  after sync and warns on non-2xx (advisory: Twitter rotates/deletes
  these URLs faster than our 7-day TTL and upstream 404s can't be
  fixed by re-running the build, so they must never wedge a deploy —
  see `shouldFailSync` + its lock in `social-embeds-integrity.test.ts`).
  The script still exits 1 when a tweet can't be fetched AND has no
  cached fallback (the "Tweet not found in production" case).

If you add a new homepage section, a new external-data dependency, or
a new visual primitive, add a matching lock in the same PR.

---

## Substantial work starts with an intent, not a diff

Anything beyond a contained fix — new infrastructure, a cross-cutting change, a
performance push, anything you would need a paragraph to justify — starts with a
committed intent, in the same PR as the code.

```
docs/intents/<slug>/intent.md    what is wanted, why NOW, constraints, non-goals,
                                 how we will know it worked
docs/intents/<slug>/design.md    requirements, the options considered, what was
                                 REJECTED and why, the implementation plan
```

Two existing pairs are the reference: `docs/intents/infra-metrics/` and
`docs/intents/ci-speed/`.

**The rules that make this worth doing, rather than paperwork:**

1. **Measure before you design.** Every claim in an intent is a number you took,
   with the run or command that produced it. `ci-speed/intent.md` exists because
   a job was timed at 194s with 82% in one build step — not because CI "felt
   slow". A design built on a guess optimises the wrong thing, expensively.
2. **Verify against `origin/main`, not your working tree.** Reviewing a stale
   branch produces a confident critique of code nobody runs. Cheap to avoid,
   embarrassing to skip — check `git log origin/main` and the package version
   before you assert anything about current behaviour.
3. **Record what you rejected.** `ci-speed/design.md` records that consolidating
   the small CI jobs would RAISE the wall-clock floor, so it is not proposed
   again every quarter. A rejected option with its reason is worth as much as
   the chosen one.
4. **Close the loop.** When the work ships, append the measured before/after to
   the intent. An intent with no outcome section is an unfinished thought.
5. **New problems found while building become new intents**, not scope creep in
   the current one. That is where `ci-speed` came from — it was noticed while
   shipping `infra-metrics`.

**Advisory vs blocking is a real distinction; keep it.** A number that
legitimately grows (bundle size, rule count) reports and does not gate — a hard
cap just gets raised until it means nothing. But _the absence of a measurement_
does block: left advisory, "advisory" decays into "unmeasured", which is how
four published plugins reached npm with no size history at all. Gate the
instrument, not the reading.

**A metric you add is a metric that can silently stop being collected.** It gets
a lock like any other invariant, and the lock has to be able to go red — prove
it by breaking the thing on purpose and watching it fail. See
`scripts/__tests__/infra-metrics-lock.test.ts`, which asserts both that a
regression trips and that a docs-only change does not.

---

## Deploy: main branch only

**Only `main` deploys to production. No other branch — feature, fix,
chore, WIP, docs, anything — should produce a deployment, preview or
otherwise.**

Why: Vercel's default Git integration spins up a preview deploy per
branch per push, which (a) generates noise in the deployment list, (b)
wastes build minutes, (c) creates ambiguity about which URL is the
source of truth, and (d) can race with production deploys when several
feature branches are in flight against a manually-fired production
deploy.

How to apply:

- The canonical deploy path is the manual `deploy-docs.yml` workflow
  (see step 6 of the PR flow below). Don't add `push:` / `pull_request:`
  triggers, and don't enable Vercel's Git-integration preview deploys
  on non-main branches.
- If you find queued / building Vercel deployments for non-main
  branches, cancel them. Don't merge a PR while a stale preview build
  for the same branch is still running — wait, cancel, or surface it.
- One commit on `main` → one production deploy. If multiple PRs land
  close together, prefer batching the manual deploy after the last
  merge rather than firing a deploy per merge.
- If you genuinely need a preview (e.g. a stakeholder demo), trigger it
  via the existing manual workflow with `target=preview`. Don't reach
  for `git push` as a deploy trigger.

---

## Don't introduce CSP / security regressions

`next.config.mjs` headers (`X-Frame-Options`, `Permissions-Policy`,
`Referrer-Policy`, etc.) are part of the deploy contract. Don't loosen
them to make a feature work — find a different feature path. If you
need to allow a new external image host, add it to
`images.remotePatterns` explicitly; do not switch to wildcard
patterns, and do not bypass `next/image`.

Auth/secret handling: never commit anything that smells like a token
(`.env`, JSON with `secret_*` keys, API responses with auth headers).
Pre-commit hooks exist for a reason — never `--no-verify`.

---

## Investigate before claiming "fixed"

"It works on my machine" is not a fix on a site that uses cache-first
data loading in production and prefer-fresh in dev. Two specific traps:

- The dev server hits live APIs while `next start` (prod build) serves
  cached JSON. A broken-in-prod, fine-in-dev bug is the _expected_
  failure mode here, not an exotic one.
- Mobile breakpoints (`md:`/`lg:` boundaries) hide bugs that desktop
  scroll never touches. Resize to ~390px and walk the page before
  signing off any layout change.

When you reproduce a visual regression, the loop is: open the page in
Chrome devtools at the affected viewport → confirm the broken pixel →
identify the data or CSS path that produced it → write the lock →
apply the fix → re-confirm in the browser.

---

## Shipping a task — PR flow

Every code change goes through a PR; `git push origin main` is blocked by
branch protection. The canonical loop is **branch → commit → push → PR →
checks → merge → auto-deploy (turbo-affected) → confirm production URL is
live**. As of 2026-05-17 (PR #123 / `feat/auto-deploy-on-main`), merges to
`main` automatically fire the per-app production deploy for every
turbo-affected app via [`.github/workflows/auto-deploy.yml`](.github/workflows/auto-deploy.yml).
The manual `deploy-docs.yml` and `deploy.yml` workflows still exist for
ad-hoc redeploys, preview targets, and emergency rollbacks — they're just
no longer the only path.

### 1. Branch from `main`

```bash
git fetch origin main
git checkout -b <type>/<short-slug> origin/main
```

Branch-name prefixes that match the linter: `feat/`, `fix/`, `chore/`,
`ci/`, `docs/`, `refactor/`.

### 2. Commit with the project's commit convention

Subject is `<type>(<scope>): <subject>`, scope required. Multi-line
bodies via HEREDOC. Always include the Claude co-author trailer.

```bash
git commit -m "$(cat <<'EOF'
fix(docs): tweet-cache HEAD-check rejects 404s before deploy

Twitter rotates photo_image_full_size_large URLs faster than our 7-day
TTL, so a "fresh" cache could still hold a 404. Add a HEAD probe in
sync-tweet-cache.ts that exits 1 on non-2xx; pair with the
social-embeds-integrity vitest lock.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### 3. Push and open a PR

```bash
git push origin <branch>

gh -R ofri-peretz/eslint pr create --base main --head <branch> \
  --title "<type>(<scope>): <short title under 70 chars>" \
  --body "$(cat <<'EOF'
## Summary

- Bulleted what-changed-and-why, one bullet per logical change.

## Test plan

- [x] Concrete commands run (lint, vitest, build) with their outcome.
- [x] If a regression-lock was added, name the file and assertion.

## After merge

What lands in production, what to watch for, any follow-ups.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 4. Wait for the CI gate to go green

Required checks on this repo (the workflow names visible on a PR):

```text
✅ oxlint (fast pass)
✅ Prettier (format check)
✅ TypeScript (typecheck)
✅ Vitest (unit + lock tests)
✅ Playwright (e2e + a11y)
✅ Build (apps/docs)
```

Poll until every check finishes, **then verify every one reports
`SUCCESS`** — the poll only ensures nothing is still pending; a `FAILURE`
or `CANCELLED` would otherwise slip past it.

```bash
PR=<#>

# 1. Wait until every required check has a terminal state.
until [ "$(gh -R ofri-peretz/eslint pr view "$PR" \
  --json statusCheckRollup \
  --jq '[.statusCheckRollup[]? | select((.conclusion // .status // "") as $s | $s == "IN_PROGRESS" or $s == "PENDING" or $s == "QUEUED" or $s == "")] | length')" = "0" ]; do
  sleep 20
done

# 2. Validation gate — refuse to merge unless EVERY required check is SUCCESS.
FAILED=$(gh -R ofri-peretz/eslint pr view "$PR" \
  --json statusCheckRollup \
  --jq '[.statusCheckRollup[]? | select((.conclusion // .state // .status) != "SUCCESS" and (.conclusion // .state // .status) != "SKIPPED" and (.conclusion // .state // .status) != "NEUTRAL") | "\(.conclusion // .state // .status)  \(.name // .context)"] | .[]')
if [ -n "$FAILED" ]; then
  echo "::error::PR $PR has non-success checks; not merging:"
  echo "$FAILED"
  exit 1
fi

gh -R ofri-peretz/eslint pr view "$PR" --json mergeable,mergeStateStatus,statusCheckRollup
```

If `mergeStateStatus == "DIRTY"` there's a conflict with `main`. Resolve
via `git fetch origin main && git merge origin/main`; do not rebase
blindly across unrelated changes. If `mergeStateStatus == "BLOCKED"`
after all checks pass, branch protection is waiting on a required review
(see CODEOWNERS / repository ruleset) — don't `--admin` past it without
asking the user.

### 5. Merge

Squash and delete the branch:

```bash
gh -R ofri-peretz/eslint pr merge <#> --squash --delete-branch
```

### 6. Watch the auto-deploy

Merging to `main` fires [`auto-deploy.yml`](.github/workflows/auto-deploy.yml).
It computes turbo-affected workspaces against the previous main commit and
dispatches the per-app deploy workflow for each affected app:

| Affected workspace                                                         | Dispatched workflow                                                          | Production URL                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| `docs` (or any dep via `...[<sha>]`, eg `@interlace/ui`, `*PHILOSOPHY.md`) | `deploy-docs.yml` (`environment=production`, includes Playwright smoke gate) | https://eslint.interlace.tools |

`docs` is the only app this repo deploys. `storybook.interlace.tools` and
`ds.interlace.tools` belong to `ofri-peretz/interlace` and deploy from there
via Vercel git integration — see
`interlace/docs/adr/0001-consolidate-duplicated-design-system.md` (D2/D4).

After merging, **don't claim "live"** until:

1. `gh -R ofri-peretz/eslint run list --workflow=auto-deploy.yml --limit=1` shows `completed success` for the new merge commit.
2. The dispatched per-app workflow(s) also show `completed success` —
   `gh run list --workflow=deploy-docs.yml --limit=1` etc.
3. The matching production URL HEADs 2xx.

If `auto-deploy.yml` fires but no per-app workflow ran, no app was
turbo-affected by the change (e.g. a PR that only touched
`.github/workflows/**` or root-level docs). That's the expected silent
path — confirm by checking the `affected` job summary.

For packages: the relevant npm publish workflow fires on the release
PR/tag, not the merge. Cross-check the release flow in AGENTS.md before
reporting `published` status.

### 7. Verify the locks that scope the change still pass

Per the regression policy at the top of this file: after merging a fix,
confirm the matching lock test (or the new one you added) would have
caught the bug pre-deploy.
