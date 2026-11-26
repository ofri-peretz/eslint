---
slug: agent-memory-earns-its-place
opened: 2026-11-25
packages: []
cases: []
---

# Intent — agent memory is checked against the code and measured, not only written

> Stage 1 artifact. Follows Anthropic's
> [Components of agent memory](https://www.anthropic.com/research/components-of-agent-memory)
> (consolidation against source, a small always-loaded index, memory measured on and off),
> mapped in `AI_SDLC_PHILOSOPHY.md` gap 4.

**Status:** draft · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

1. **Notes are checked against what they describe.** A weekly consolidation run reads each memory
   file and checks every concrete claim against the repo or GitHub: a path, a script, a count, a
   PR state. It fixes or deletes stale notes and writes a log of what changed and why.
2. **The index stays under its load limit.** `MEMORY.md` is loaded every session and only its
   first 200 lines are read. A check fails when it passes 150 lines or when an entry passes 150
   characters, so it never silently truncates.
3. **Memory is measured once, on and off.** Run a fixed set of 10 recurring task prompts in this
   repo (for example "add a rule's oxlint alias", "why is CI red on main") with memory and
   without. Compare turns to done and wrong first moves.

## Why now

- Memory files name paths, flags and PR states that drift. The index itself warns that `project`
  notes decay within days to weeks. Nothing re-checks them; a session reads them as true.
- Observed 2026-11-25: memory said `eslint/` had no intents directory (`eslint_has_intents.md`
  corrects it); the parent CLAUDE.md is still stale on the same point.
- No one has measured whether memory saves turns at all.

## Affected users and systems

`~/.claude/projects/-Users-ofri-repos-ofriperetz-dev-eslint/memory/` (local, not in git), a
scheduled consolidation task, and a small index-size check.

## Constraints

- Memory stays local and is never committed or sent anywhere. The log of changes stays next to
  it.
- Consolidation never deletes a `feedback` memory (a standing rule from the owner); it only flags
  it for review.
- The on/off measurement runs once, on 10 tasks: enough to decide whether to invest further, not
  a standing suite.

## Success criteria

- One consolidation log entry per week, listing claims checked, fixed and deleted. The first run
  finds at least one stale claim, or records that none was found and how many were checked.
- The index check fails on a planted 151st line and on a 151-character entry.
- An on/off table for the 10 tasks, giving turns to done and wrong first moves, with a decision:
  keep investing in memory, or stop.
