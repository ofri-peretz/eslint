---
slug: every-session-starts-under-45k
opened: 2026-11-26
packages: []
cases: []
---

# Intent — every Interlace session starts under 45k tokens, and night runs pay it as rarely as possible

> Stage 1 artifact. The owner asked on 2026-11-26 to cut token use as far as possible, through the
> subagent-gateway plugin, headroom, CodeGraph and anything else, bearing in mind that much of the
> work now runs on a schedule overnight.

**Status:** draft · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

---

## What is wanted

1. **A smaller fixed context.** Every session, including every scheduled run, pays the context it
   loads before doing anything. Cut what is ours to cut:
   - Snappy (work) skills and commands live at user level, so all 27 `snappy-*` skills are listed in
     every Interlace session. Scope them to the Snappy repos.
   - MCP servers that connect in Interlace sessions without being used there. Measure each one's
     tool-schema cost first, and turn off for the Interlace folders those that are never called.
   - eslint's `MEMORY.md` index is 13 KB, about 3,300 tokens on every eslint session. Bring it under
     6 KB without losing a pointer: shorter hooks, and the long `feedback` list grouped.
2. **Scheduled runs that exit before they pay.** A task that usually finds nothing to do still loads
   the full context. Put a cheap shell pre-check in front of each frequent task, so that a Claude
   session starts only when there is work. Candidates: `pr-shepherd` (every 30 minutes),
   `gmail-tagging` (every 10 minutes), `oss-growth-hourly-backup` and this repo's night loop.
3. **Night runs that do not collide.** 06:00–06:40 holds `article-release-queue`,
   `burgee-fp-fn-sweep`, `nestjs-release-reconciler` and the night loop. Under load every process
   start slows (CLAUDE.md, "Local machine"). Stagger them, and let the night loop skip when another
   suite is running (it already does).

## Why now

Measured 2026-11-26 with
`claude -p "Reply with the single word ok." --model sonnet --max-turns 1 --output-format json`
in this repo:

| Configuration                        | Fixed tokens |
| ------------------------------------ | -----------: |
| As is                                |       58,487 |
| No MCP servers                       |       52,203 |
| No skills or commands                |       55,823 |
| Project and local settings only      |       44,177 |
| Floor: empty folder, nothing of ours |       38,290 |

About 20k tokens, a third of every session, are ours to cut. With 20+ scheduled tasks, some
running every 10–30 minutes, that is paid hundreds of times a day.

Already done, and not repeated here:

- **RTK** was wired as a Bash hook but never installed, so it saved nothing. It is installed
  (Homebrew `rtk` 1.2.1) and saved 21% on the commands it filtered in its first session.
- **CodeGraph** is on `main` in every Interlace repo.
- The 8 Snappy user-scope MCP servers (including `mongodb_production`) are turned off for every
  Interlace folder in `~/.claude.json`. This was for safety, not tokens: they were not loading
  in headless runs.

Measured and rejected: the **headroom proxy**. On the same JSON-heavy task, 0.30 compressed nothing
and 0.45 compressed 1,386 tokens. Both broke the prompt-cache prefix: about 25k more cache-write
tokens and about 55% more cost per run ($0.26 vs $0.17). Revisit only when a headroom release keeps
the cache prefix stable.

## Affected users and systems

User-level Claude Code configuration (`~/.claude/skills`, `~/.claude/commands`, `~/.claude.json`
per-folder MCP lists), eslint's auto-memory index, and the scheduled tasks in
`~/.claude/scheduled-tasks/`. No package source changes.

## Constraints

- Snappy work sessions must keep every skill and MCP server they use today. Move them to where that
  work runs; do not delete them.
- No change to what a scheduled task does, only to when it starts a session. A pre-check that
  wrongly finds nothing must fail open and start the session.
- Measure every change with the command above, before and after, three runs each, and report the
  median.

## Success criteria

- The fixed context in eslint is under 45,000 tokens (median of 3), down from 58,487.
- A Snappy repo session lists the same skills and MCP servers as before, checked by `claude mcp
list` and the skill list in a Snappy folder before and after.
- Over one week, the number of Claude sessions started by `pr-shepherd` and `gmail-tagging` falls by
  at least half, with no missed work. Missed work would show as a PR left unshepherded or a thread
  left untagged in that week.
- No two heavy scheduled tasks start within 15 minutes of each other between 22:00 and 07:00.
