---
slug: the-model-mix-is-measured
opened: 2026-11-25
packages: []
cases: []
---

# Intent — which model does the work is measured, and the context we inject earns its place

> Stage 1 artifact. The work lands in `ofri-peretz/subagent-gateway` (the routing plugin); it is
> recorded here because eslint is where its cost was observed.

**Status:** draft · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

1. **One trusted count.** A script over local Claude Code transcripts
   (`~/.claude/projects/**/*.jsonl`) counts subagent calls per day by model (Opus, Sonnet, Haiku)
   and by agent type. It also counts tokens per model, and missed hand-offs: main-model reads a
   worker could have done. This replaces the plugin's own savings counters, which showed
   impossible numbers.
2. **The per-message instruction is tested, not assumed.** The plugin adds a hand-off instruction
   to every prompt. Run one week with it and one week without, with routing (model chosen by the
   call's type) unchanged. Then compare the worker share, the Haiku share and the main-context
   tokens.
3. **Read-only work reaches Haiku when it can.** Routing already sends `Explore`, `web-fetch`,
   `claude-code-guide` and look-only `general-purpose` calls to Haiku, and the workers may run
   GET-only `gh api` reads (subagent-gateway#19). Measure the share of read-only subagent calls
   that ran on Haiku, and the share that came back empty.

## Why now

- The user's own side-by-side: same cost and same answer quality with the plugin, but runs took
  twice as long. Haiku workers got 12% of agent calls, falling to about 3 a day.
- Two worker calls in one session (2026-11-25) came back empty: one stalled on a permission
  prompt, one could not read a running CI log. Each read then fell back to the main model.
- The hand-off instruction appears in every turn's context and has never been tested against its
  absence.

## Affected users and systems

The subagent-gateway plugin (`hooks/rules.ts`, `hooks/register.tsx`), a new script that reads the
transcripts, and every Claude Code session that runs the plugin.

## Constraints

- Transcripts stay on this machine. The script prints counts only and never sends content
  anywhere.
- Quality is held fixed. A routing change that lowers the side-by-side answer quality is
  reverted, whatever it saves.
- One variable per comparison week.

## Success criteria

- The script's daily totals match a hand count of one session's transcript (one test fixture).
- A report with and without the hand-off instruction, giving worker share, Haiku share,
  main-context tokens per turn and the side-by-side run time. The instruction is kept only if it
  wins on worker share without losing on run time.
- The empty-worker rate is measured; under 5% is the bar for keeping the workers at all.
