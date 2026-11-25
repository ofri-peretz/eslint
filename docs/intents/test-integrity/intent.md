---
slug: test-integrity
opened: 2026-11-23
packages: []
cases: []
---

# Intent — lint rules for the ways an agent games a test suite

> Stage 1 artifact. Opened from the Interlace OSS verification gap analysis
> ([doc](https://claude.ai/artifact/BCjCqoaRfDvtQeha24HrNi)), which follows
> [How the Claude Code team thinks about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/)
> (2026-11-16): Claude "may not skip flaky tests, add sleeps, or retry until they pass". Here that
> rule is a lint rule, not a sentence in CLAUDE.md. The owner placed it in this repo on 2026-11-23:
> missing rules are implemented here so they spread to every consumer, with lefthook for what a
> rule cannot see. The companion tools (proofline, triggerlist, replay) live in burgee
> (`burgee/.sdlc/decisions/D-20261123-verification-tools-live-in-burgee.md`).

**Status:** dropped · **Opened:** 2026-11-23 · **Owner:** @ofri-peretz

---

## What is wanted

A new plugin, `eslint-plugin-test-integrity`, with its generated oxlint shim. Every message comes
from `formatLLMMessage` and names the fix.

AST rules, in the editor and in `npm run lint`:

- `no-focused-test`: `.only` on `it`, `test`, `describe`, `bench`.
- `no-unexplained-skip`: `.skip`, `.todo`, `xit`, and `skipIf`/`runIf` with a constant condition,
  unless a comment on the same or previous line carries a `YYYY-MM-DD` that is not past, or an
  issue URL.
- `no-fixed-sleep`: awaited `setTimeout` promises, `sleep()`/`delay()` helpers and
  `page.waitForTimeout()` in test files. The fix names the event or condition to await.
- `no-test-retry`: `retry`/`retries` in test options and in vitest, jest and Playwright config
  objects, unless a comment cites a decision or issue.

Diff checks, shipped as a `bin` in the same package and run from a lefthook `pre-push` step,
because a rule sees one file and not what changed:

- `weakened-assertion`: an `expect(<subject>)` whose matcher moved down a fixed strictness order
  (`toBe` > `toEqual` > `toMatchObject` > `toBeTruthy` / `toBeDefined`) in the same change.
- `unexplained-snapshot`: a changed `.snap` file with no `Snapshot:` reason in the commit message.

## Why now

- No plugin in this repo has a rule for `.only`, `.skip`, sleeps or retries in tests
  (rule file names under `packages/eslint-plugin-*/src/rules` matching
  `only|skip|sleep|retry|focus|test`, 2026-11-23: six hits, all a11y or test-id rules). The nearest is the internal `tools/eslint-rules/require-vitest-watch-false`.
- None of eslint, interlace, agents or burgee enables `vitest/no-focused-tests` or an equivalent
  in its ESLint or oxlint config (survey of each repo's `eslint.config.*` and `.oxlintrc.json`,
  2026-11-23).
- burgee holds this line by convention only: decision D-107 and its timeout lock. Nothing stops
  a `.skip` or a `retry` landing in a repo that never had that incident.

## Affected users and systems

A new `packages/eslint-plugin-test-integrity` and `packages/oxlint-plugin-test-integrity`; the
oxlint shim copies in interlace and agents; every Interlace repo's lint config and `lefthook.yml`
once published.

## Constraints

- Same scaffold, devkit, dual ESLint/oxlint tester and docs pipeline as every plugin here.
- `skipIf`/`runIf` with a runtime condition stay legal: burgee alone has 137 such calls, mostly
  platform gates.
- The two diff checks never read a whole file, only changed lines, and run in lefthook, not in
  the editor.
- New rules ship at `warn` in consumers and move to `error` by decision, after they have run on
  real code.

## Success criteria

- Each AST rule has valid and invalid cases in `vitest.dual-rule-tester.ts`, and a planted `.only`,
  `await sleep(500)` and `retry: 3` each fail red before the rule and pass after.
- The plugin is enabled at `warn` in this repo and burgee with zero findings on `main`, or each
  finding fixed or explained in the same PR.
- A planted `toBe(3)` to `toBeTruthy()` change is reported by the `pre-push` step with file and
  line.
- The rule-audit and mutation baselines include the new package.
- **End state (the owner, 2026-11-23: every concept to its strongest form):** every rule at
  `error` in all six JS repos of Interlace OSS (burgee, eslint, interlace, agents, serverless,
  blog) through their shared configs, the diff checks in each repo's lefthook `pre-push`, and
  zero findings on every `main`.

## Open questions

- A new plugin, or new rules in `eslint-plugin-conventions`? The default here is a new plugin, so
  consumers adopt it in one line and its scope stays testing; the owner may prefer fewer plugins.

## Dropped

2026-11-23. The owner moved this work to burgee: the four rules and the changed-lines check
(weakened assertions, unexplained snapshot updates) ship there as the `truemark` package, whose
CLI is a burgee program. See `burgee/.sdlc/intents/truemark/intent.md` and
`burgee/.sdlc/decisions/D-20261123-truemark-lives-in-burgee.md`. A first build here
(eslint-plugin-test-integrity on the devkit) was removed from the same PR that added it,
before it merged, so this repo never shipped the plugin.
