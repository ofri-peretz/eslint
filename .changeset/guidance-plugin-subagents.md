---
'eslint-plugin-conventions': minor
---

The guidance rules read a Claude Code plugin's subagents (`agents/*.md` beside `.claude-plugin/plugin.json`) as subagents, and the `guidance` preset lints `**/agents/*.md` for them. Before this, `subagent-declares-model` never saw a plugin's agents.
