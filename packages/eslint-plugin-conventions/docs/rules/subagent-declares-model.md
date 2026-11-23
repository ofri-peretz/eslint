---
title: subagent-declares-model
description: 'Require every .claude/agents/*.md subagent to declare a model and a tool allowlist in its frontmatter'
tags: ['quality', 'conventions', 'agents', 'markdown']
category: quality
autofix: false
---

> Every subagent declares its model and its tool allowlist

<!-- @rule-summary -->

Require every .claude/agents/*.md subagent to declare a model and a tool allowlist in its frontmatter
<!-- @/rule-summary -->

## Rule Details

A subagent with no `model:` inherits the parent session's model — usually the most expensive one,
for a task picked precisely because it was narrow. One with no `tools:` inherits every tool,
including the ones that write. Both are one frontmatter line each.

A Claude Code plugin's subagents count too: `agents/*.md` in a folder whose parent holds
`.claude-plugin/plugin.json`. The `guidance` preset lints `**/agents/*.md` for them, and an
`agents/` folder with no plugin manifest beside it is not read as subagents.

## Examples

### ❌ Incorrect

```md
---
name: reviewer
---

Review the diff.
```

### ✅ Correct

```md
---
name: reviewer
model: haiku
tools: Read, Grep, Glob
---

Review the diff.
```
