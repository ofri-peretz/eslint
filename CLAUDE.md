# CLAUDE.md — agent context for this repo

> **Read this first.** AI assistants (Claude, GPT, etc.) working in this repo
> should follow the conventions below. The broader playbook is in
> [AGENTS.md](./AGENTS.md) — release flow, branch protection, plugin scope,
> CI gates. This file captures the *behavioral* contract on top.

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

The default question for every change in this repo is: *"if I revert
the fix, would CI go red?"* If the answer is no, the fix is half-done.

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
  after sync and exits 1 on non-2xx. Twitter rotates these URLs
  faster than our 7-day TTL, so a "fresh" cache can still hold a 404.

If you add a new homepage section, a new external-data dependency, or
a new visual primitive, add a matching lock in the same PR.

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
  cached JSON. A broken-in-prod, fine-in-dev bug is the *expected*
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
checks → merge → auto-deploy**.

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

Poll until every check finishes — don't merge on red or unknown:

```bash
until [ "$(gh -R ofri-peretz/eslint pr view <#> \
  --json statusCheckRollup \
  --jq '[.statusCheckRollup[]? | select((.conclusion // .status // "") as $s | $s == "IN_PROGRESS" or $s == "PENDING" or $s == "QUEUED" or $s == "")] | length')" = "0" ]; do
  sleep 20
done
gh -R ofri-peretz/eslint pr view <#> --json mergeable,mergeStateStatus,statusCheckRollup
```

If `mergeStateStatus == "DIRTY"` there's a conflict with `main`. Resolve
via `git fetch origin main && git merge origin/main`; do not rebase
blindly across unrelated changes.

### 5. Merge

Squash and delete the branch:

```bash
gh -R ofri-peretz/eslint pr merge <#> --squash --delete-branch
```

### 6. Watch the auto-deploy

The docs site uses the **manual** `deploy-docs.yml` flow (per
[AGENTS.md](./AGENTS.md)); merges to `main` do **not** auto-deploy.
After merging a docs-touching PR, surface that the manual deploy is
still pending — don't claim "live" until you've watched the workflow
run and confirmed at https://eslint.interlace.tools.

For packages: the relevant npm publish workflow fires on the release
PR/tag, not the merge. Cross-check the release flow in AGENTS.md before
reporting `published` status.

### 7. Verify the locks that scope the change still pass

Per the regression policy at the top of this file: after merging a fix,
confirm the matching lock test (or the new one you added) would have
caught the bug pre-deploy.
