---
'eslint-plugin-conventions': minor
---

feat(conventions): `guidance` preset — lint CLAUDE.md, AGENTS.md, skills and subagents for where each rule lives

Five Markdown rules over agent guidance files, run on `@eslint/markdown` and enabled by the new
`guidance` preset at `warn`: `guidance-budget` (bytes and lines per always-loaded file, lines and
description length per skill, with a per-repo ratchet that may only go down),
`enforced-rule-in-prose` (a `never` / `always` line naming something a tool could check, with no
link to the rule, hook or lock test that enforces it — or with one, so the line is removable),
`procedure-in-memory` (a long numbered procedure in a file read on every session),
`subagent-declares-model` (`model:` and `tools:` in every `.claude/agents/*.md`) and
`no-duplicated-guidance` (the same line in two always-loaded files). The `recommended` preset is
unchanged.
