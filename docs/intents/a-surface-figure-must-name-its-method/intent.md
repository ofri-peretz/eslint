# Intent — every published quality figure carries the command that reproduces it

> Stage 1 artifact. Opened after six intents were re-checked and three of their
> numbers were wrong, unreproducible, or both.

**Status:** shipped · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

A number published anywhere in this repository — an intent, a README, a
manifest, a PR body — names the command that produces it. A reader can run that
command and get the same number, or find out that they cannot.

## Why now

This is the defect the whole quarter has been spent finding, and it keeps
appearing in new places:

| artefact                | the number               | what it was                                                                        |
| :---------------------- | :----------------------- | :--------------------------------------------------------------------------------- |
| real-source inventory   | 270 rules catch nothing  | **84**, and the file recorded no `configHash`                                      |
| API-surface manifest    | node-security 70% of 47  | ≤55% of 199, every figure typed by hand                                            |
| `default-on-rules-fire` | 327 rules enabled        | **287**, no method recorded                                                        |
| `codecov-components`    | eleven plugins uncovered | eleven — but a re-check said eight by subtracting totals instead of matching lists |
| corpus scan             | every target failed      | 6,200 findings; the error handler had eaten `stdout`                               |

Five artefacts, five numbers, and the common property is not that they were
wrong. It is that **none of them said how it was obtained**, so nobody could
tell. The corpus figure was wrong for weeks. The inventory figure was wrong by
a factor of three and was quoted as a product fact.

Two figures in the repository now do carry a method — `npm run
measure:api-surface` and `npm run measure:default-on-rules` — and both were
written this quarter, both after the figure they replaced turned out to be
fiction.

## Constraints

- **Not every number needs a command.** A count in a commit message describing
  that commit is fine. This is about figures that OUTLIVE their change:
  manifests, intents, published docs, dashboards.
- **The command must be runnable by a reader**, not "re-run the pipeline" — a
  reproduction that takes a scheduled CI job is a reproduction nobody performs.
- **Cannot be enforced by a linter alone.** Prose is prose; a regex that
  demanded a code fence next to every digit would be noise. The gate has to be
  narrower than the principle.
- **Retrofitting every existing figure is out of scope.** The debt is real and
  large; this is about stopping the next one.

## Success criteria

- **Now:** 2 figures with a method · at least 5 known to have been wrong ·
  0 gates.
- **Wanted:** every figure in `.agent/*.json` and `benchmarks/budgets/*.json`
  names the command that regenerates it, in the file.
- **Breach:** a budget or manifest artefact with no `command` field.
- **Proven by:** a lock test that reads every artefact under those two
  directories and fails when one cannot say how it was made.
