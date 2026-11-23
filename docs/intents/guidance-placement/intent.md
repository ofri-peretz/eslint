---
slug: guidance-placement
opened: 2026-11-23
packages: []
cases: []
---

# Intent — lint agent guidance so every rule lives where it can't be forgotten

> Stage 1 artifact. Opened from the Interlace OSS verification gap analysis
> ([doc](https://claude.ai/artifact/BCjCqoaRfDvtQeha24HrNi)). The owner, 2026-11-23: do not settle
> on the size of CLAUDE.md and skills; decide for each line whether it belongs in a helper, a hook,
> a gate or a lint rule. A parallel effort is moving lines by hand across all repos; this intent
> makes the result hold. The rule-placement idea comes from the Snappy Agent Playbook ("for every
> rule, ask: can a tool check this?") and the post's "code decides facts, Claude decides meaning".

**Status:** draft · **Opened:** 2026-11-23 · **Owner:** @ofri-peretz

---

## What is wanted

Rules for `@eslint/markdown` over `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude/skills/**/SKILL.md`
and `.claude/agents/*.md`, in `eslint-plugin-conventions`:

- `guidance-budget`: bytes per always-loaded file (default 4 KB for `CLAUDE.md`/`AGENTS.md`,
  ~200 lines), per skill body (500 lines) and per skill description; a ratchet file may only
  lower them.
- `enforced-rule-in-prose`: an imperative line (`never`, `always`, `must`, `do not`,
  `IMPORTANT`) that names a command, file, flag or code pattern a tool could check, and carries
  no link to the lint rule, hook, lock test or gate that enforces it. The fix names the lever:
  a lint rule id, a hook preset station, or a lock test. A line that does link one is flagged as
  removable, because the tool already enforces it.
- `procedure-in-memory`: a numbered procedure over N steps in an always-loaded file; the fix is
  to move it to a skill.
- `subagent-declares-model`: every `.claude/agents/*.md` has a `model:` in its frontmatter and a
  tool allowlist.
- `no-duplicated-guidance`: the same rule text in two always-loaded files of one repo.

## Why now

- The slimming plan measured about 67 KB of always-loaded guidance across the Interlace repos
  against a 20 KB target
  ([plan](https://claude.ai/artifact/RYSoHdnifxBEEf9Mngf7K2), 2026-11-23). A hand migration
  regrows unless a rule holds it.
- Every repo's CLAUDE.md says "never `--no-verify`. The hooks are the gate." Blog has no git
  hooks, so that line guards nothing (guardrails audit, 2026-11-23). A rule that asks "which tool
  enforces this?" would have flagged it.
- No linter in the open classifies agent guidance by where it should live; the closest tools
  check markdown style or link validity.

## Affected users and systems

`packages/eslint-plugin-conventions` (new rules and a markdown config), every Interlace repo's
ESLint config once published.

## Constraints

- Code decides facts, the model decides meaning: these rules only report what a parser can tell
  (size, imperative + checkable target, missing link, missing frontmatter). Whether a line is
  worth keeping stays a person's call.
- Each finding's message carries a `fix:` through `formatLLMMessage`.
- Budgets come from a per-repo ratchet file; the rule never guesses a budget.
- Ships at `warn`, moves to `error` by decision after it runs clean on every repo's `main`.

## Done when

- Each rule has valid and invalid fixtures, including the `--no-verify` line with and without a
  linked hook.
- Run on all eight Interlace repos, the findings list is reviewed and the false-positive rate of
  `enforced-rule-in-prose` is under 10%, recorded with the command that produced it.
- **End state (the owner, 2026-11-23: every concept to its strongest form):** at `error` in every
  repo; every always-loaded file within its ratcheted budget; zero imperative lines that a tool
  enforces without linking it, and zero that no tool enforces but a tool could.

## Open questions

- The imperative-plus-target heuristic is the risky part; if its false-positive rate stays above
  10% after one tuning pass, it ships as a report command instead of a rule.
