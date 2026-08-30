---
slug: the-silence-number-becomes-true
opened: 2026-08-30
packages: []
cases: []
---

## What

Re-run the 112-repository real-source scan under the current config and commit
the result, so `rules that fire on real code` and `scanned and never fired`
become numbers again instead of a `STALE` marker.

Then triage what the true number turns out to be: for each rule the scan still
finds silent, decide whether it is a rare defect worth keeping or a rule with
no observed purpose.

## Why

This is the largest unknown in our product quality, and until 2026-08-30 we
believed we knew it.

The ledger printed **"270 of 470 rules scanned and never fired"** and it was
read as a finding about the rules. It was an artifact of the instrument: seven
whole plugins — `react-a11y`, `react-features`, `conventions`,
`maintainability`, `reliability`, `operability`, `nestjs-security` — fired zero
rules between them, across a corpus containing MUI, chakra-ui, shadcn/ui,
storybook and react-router. The old scan config matched `**/*.js` with no
TypeScript parser, so 214,855 TypeScript files were walked, handed to ESLint,
and matched by no config block. Ten lines of JSX through the current config
produce eight `react-a11y` findings.

The ledger now refuses to print the count when the config hash does not match,
which is honest but not informative. The number itself is still owed.

It matters because "never fired on 345,841 files of other people's code" is the
strongest negative claim we make about a rule, and it is the one that should
decide whether a rule keeps its place in a preset.

## Constraints

- **The scan is the expensive part** — 112 repositories cloned and linted. It
  runs once, deliberately, not as a side effect of some other task.
- The committed inventory must carry the `configHash` of the config that
  produced it. An inventory without one is exactly the artifact that misled us.
- **Silence is not a verdict.** A rule that does not fire may be catching
  something rare and real; `no-eval` firing zero times is good news. Every
  silent rule gets a reason recorded, not a deletion.
- No rule is removed on this branch. Triage produces a list; acting on it is
  separate work with its own intent.
- `check:audit-freshness` must go green for the inventory row (45-day TTL).

## Done when

- `npm run check:rule-cases` prints a silence count instead of `STALE`.
- The seven plugins that fired nothing either fire something, or their silence
  has a written reason.
- Every rule still silent after the re-run is listed with one of: _rare defect,
  expected_; _no material in corpus, needs a targeted repo_; or _no observed
  purpose, candidate for review_.
- The count and its date are quoted in `AI_SDLC.md` in place of the current
  "unknown until the scan is re-run".
