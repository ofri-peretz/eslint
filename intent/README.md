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
