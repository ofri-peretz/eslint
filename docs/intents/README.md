# `docs/intents/` — Stage 1 (Plan) and Stage 2 (Design)

Every substantive change starts here. See
`AI_NATIVE_SDLC.md`, one level up from this repo, for why.

## Layout

```
docs/intents/
  <slug>/
    intent.md    Stage 1 — what is wanted, why, under which constraints
    design.md    Stage 2 — requirements + design (added when work is designed)
```

One directory per intent. `slug` is kebab-case and stable — it is how the pair is
referenced from PRs, commits and later intents.

## The shape the lock enforces

`scripts/__tests__/intent-artifacts.lock.test.ts` checks these, because an artifact
nobody can rely on the shape of is a chat message in a file:

| File | Must carry |
| :--- | :--- |
| `intent.md` | `# Intent — <title>`, a `**Status:**` line, `## What is wanted`, `## Why now`, `## Constraints`, and `## Success criteria` (or `## How we will know it worked`) |
| `design.md` | a record of what was rejected — `## Rejected alternatives`, `## Explicit non-goals`, `## Non-goals` or `## Out of scope` |

It also fails if an `intent.md` appears **anywhere outside this directory**. That is
not pedantry: this repo ran two conventions at once, `intent/` and `docs/intents/`,
and every check stayed green because each only looked at its own folder.

## The flow

1. **Draft** `intent.md` from [`_template/intent.md`](./_template/intent.md). The
   originator writes it, with Claude's help. Status starts `draft`.
2. **Review.** A human moves it to `review`, then `approved`. An `approved` intent
   with no `design.md` beside it is a lock failure — approval means designed, not
   merely liked.
3. **Design.** Ask Claude to turn it into `design.md`:

   > Read `docs/intents/<slug>/intent.md` and produce a requirements and design spec for
   > integrating it into our existing codebase. Apply the skills available to you so
   > the plan conforms to our brand guidelines, security policies and UX standards.

4. **Accept.** A human decides whether the pair progresses to Build. That acceptance
   is what starts plan mode.
5. **Ship.** Reference the slug in the PR. On merge, set status to `shipped`.

## Status values

| Status | Means | Requires `design.md` |
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
