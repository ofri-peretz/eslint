---
slug: the-corpus-has-the-material
opened: 2026-08-30
packages: []
cases: []
---

## What

A rule can only be observed firing on code that contains its subject. Measure
what the 113-repository corpus actually contains, and either add the missing
material or record that a plugin's silence is a **corpus gap rather than a rule
defect** — which is a different sentence, and the honest one.

## Why

The 110 rules with no fixture and no observed firing cluster hard, and the
clusters line up with what the corpus does not have:

| Plugin               | Silent rules | Repos in the corpus that could exercise them |
| -------------------- | -----------: | -------------------------------------------- |
| `react-a11y`         |           37 | 3                                            |
| `vercel-ai-security` |           13 | 2                                            |
| `nestjs-security`    |           10 | 1                                            |
| `pg`                 |            9 | 5 (shared across 6 SQL plugins)              |
| `lambda-security`    |            7 | 1                                            |
| `mongodb-security`   |            5 | **0**                                        |

`mongodb-security` is the clean case: **zero** repositories in the corpus use
Mongo, so five rules were counted as "never fires on real code" when no real
code that could trigger them was ever linted. That is not a finding about those
rules. It is a finding about the corpus.

The scan header already draws this distinction — "firing is not catching" — and
the silence intent already names the bucket: _no material in corpus, needs a
targeted repo_. Nobody has assigned rules to it, so every silent rule currently
reads as the worst bucket by default.

## Constraints

- **Do not add a repository to make a specific rule fire.** That is fitting the
  instrument to the answer. Repos are chosen for being representative users of
  the framework, and the choice is recorded with its reason before the scan
  runs.
- A repo added to the corpus is a permanent measurement input: it changes the
  `reposHash` and therefore invalidates every prior number. Batch additions, and
  re-run once.
- Depends on `the-silence-instrument-is-recorded`. Adding material before the
  instrument records what it measured produces a number that cannot be compared
  to the one it replaces.
- A plugin whose material genuinely cannot be represented — because the
  ecosystem has no substantial open-source user — records that, with the search
  that established it. "We could not find one" is a finding; silence is not.

## Done when

- Every plugin with silent rules has either representative repositories in the
  corpus, or a recorded reason none could be found.
- The inventory distinguishes **"linted material and did not fire"** from
  **"no material linted"**, per rule. These are currently the same number and
  they are not the same claim.
- `mongodb-security`'s five rules are out of the no-evidence set, in one
  direction or the other.
