---
title: guidance-budget
description: 'Keep always-loaded agent guidance (CLAUDE.md, AGENTS.md) and skills inside a ratcheted size budget'
tags: ['quality', 'conventions', 'agents', 'markdown']
category: quality
autofix: false
---

> Keep always-loaded agent guidance and skills inside a ratcheted size budget

<!-- @rule-summary -->

Keep always-loaded agent guidance (CLAUDE.md, AGENTS.md) and skills inside a ratcheted size budget
<!-- @/rule-summary -->

## Rule Details

`CLAUDE.md`, `AGENTS.md` and `GEMINI.md` are read into every agent session before the task. A
hand migration that moves their rules into hooks and lint rules regrows unless something holds the
size. This rule is that something.

| File                                  | Measure                        | Default budget |
| :------------------------------------ | :----------------------------- | -------------: |
| `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` | bytes                          |           4096 |
| `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` | lines                          |            200 |
| `SKILL.md`, `.claude/agents/*.md`     | body lines (after frontmatter) |            500 |
| `SKILL.md`                            | `description:` characters      |           1024 |

This is a Markdown rule: it runs on [`@eslint/markdown`](https://github.com/eslint/markdown) and is
enabled by the `guidance` preset.

### The ratchet

A file over its default on the day the rule is turned on gets an entry in the ratchet file
(default `.guidance-budget.json`, keyed by path from the lint working directory):

```json
{ "CLAUDE.md": { "bytes": 6200, "lines": 140 } }
```

The entry is that file's budget. It may only go down: when the file shrinks below an entry that is
above the default, the rule reports `looseRatchet` and asks for the entry to follow it.

## Options

```json
{
  "memoryBytes": 4096,
  "memoryLines": 200,
  "skillLines": 500,
  "descriptionChars": 1024,
  "ratchetFile": ".guidance-budget.json"
}
```

## Examples

### ❌ Incorrect

A 9 KB `CLAUDE.md` with no ratchet entry.

### ✅ Correct

A 3 KB `CLAUDE.md` that links its skills and lint rules instead of restating them.
