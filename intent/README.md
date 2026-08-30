# `intent/` — what we set out to do, before we did it

Stage 1 of [`AI_SDLC.md`](../AI_SDLC.md). One file per initiative, written
**before** the work, checked by `npm run check:intent`.

## Why this exists

A prompt is not an artifact. The agent that picks this work up next week — or
the human reviewing a 45,000-line diff — has only what is in the repo. When the
"why" lives in a commit message it is not addressable, not checkable, and not
comparable against what actually happened.

The AI-native failure mode is specific and this file is aimed at it: an agent
given a broad task **drifts**. It starts on `no-zip-slip`, notices something in
`no-ssrf`, and eleven plugins later nobody can say whether the result is the
work that was asked for. An intent file with a declared blast radius turns that
from a feeling into a diff.

## What the gate actually checks

Not word count. Four things a stub cannot satisfy:

1. **An intent file was added on this branch** when the diff changes
   consumer-visible source.
2. **`packages:` is a superset of what the diff touches.** Work that spreads
   beyond its declared radius fails, naming the packages that were not
   declared. Widening the list is a deliberate edit, which is the point.
3. **Every id in `cases:` exists** in `benchmarks/cases/registry.json`. Intent
   that cannot name a case it answers is a wish.
4. **No placeholders.** `TODO`, `TBD`, `???` in a required field is a
   half-written intent, which is worse than none — it looks satisfied.

## The template

```markdown
---
slug: short-kebab-name
opened: YYYY-MM-DD
packages:
  - eslint-plugin-node-security
cases:
  - ILB-0042
---

## What

One paragraph. The change a consumer would notice.

## Why

The evidence. A probe result, a real-source finding, a peer comparison — not
"it would be nice". If there is no evidence, this is a proposal, not intent.

## Constraints

What this must not break. Name the gates and the numbers that must hold.

## Done when

Checkable conditions. "The ratchet moved from N to M", not "the rule is better".
```

## Rules

- **One initiative, one file.** Not one per PR and not one per commit.
- **Written before the work.** A file added in the same commit as the fix is
  allowed; a file written after the branch is green is a reconstruction and
  must say so in the body.
- **Amend it when scope changes.** Widening `packages:` mid-branch is normal
  and honest. Silently exceeding it is what the gate exists to stop.
- **Never delete one.** They are the record of what we meant, including the
  times we were wrong about it.
