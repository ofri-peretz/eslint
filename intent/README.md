<<<<<<< HEAD
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

<!--
`packages: []` and `cases: []` are valid and mean "none" — a scheduled
workflow, a script or a measurement touches no package. Omitting the key would
say the same thing ambiguously: "none" and "I forgot" look identical.
-->

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
=======
# `intent/` — Stage 1 (Plan) and Stage 2 (Design)

Every substantive change starts here. See
`AI_NATIVE_SDLC.md`, one level up from this repo, for why.

## Layout

```
intent/
  <slug>/
    intent.md    Stage 1 — what is wanted, why, under which constraints
    spec.md      Stage 2 — requirements + design (added when work is designed)
```

One directory per intent. `slug` is kebab-case and stable — it is how the pair is
referenced from PRs, commits and later intents.

## The flow

1. **Draft** `intent.md` from [`_template/intent.md`](./_template/intent.md). The
   originator writes it, with Claude's help. Status starts `draft`.
2. **Review.** A human moves it to `review`, then `approved`. An `approved` intent
   with no `spec.md` beside it is a lock failure — approval means designed, not
   merely liked.
3. **Design.** Ask Claude to turn it into `spec.md`:

   > Read `intent/<slug>/intent.md` and produce a requirements and design spec for
   > integrating it into our existing codebase. Apply the skills available to you so
   > the plan conforms to our brand guidelines, security policies and UX standards.

4. **Accept.** A human decides whether the pair progresses to Build. That acceptance
   is what starts plan mode.
5. **Ship.** Reference the slug in the PR. On merge, set status to `shipped`.

## Status values

| Status | Means | Requires `spec.md` |
| :--- | :--- | :---: |
| `draft` | being written | no |
| `review` | awaiting a human read | no |
| `approved` | designed and cleared for build | **yes** |
| `shipped` | merged | **yes** |
| `dropped` | deliberately not doing it — keep the file, it is a record | no |

## Where intents come from

Two sources, and the second is the one that makes this a loop:

- **A person** has an idea, a complaint, or a requirement.
- **A control-band breach.** `scripts/control-bands.ts` watches metrics and, on a
  breach, writes its diagnosis here as an `intent.md` in exactly this format. An
  incident re-enters the pipeline instead of rotting in a ticket queue.
>>>>>>> origin/main
