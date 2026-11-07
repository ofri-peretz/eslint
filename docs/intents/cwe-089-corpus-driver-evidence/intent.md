# Intent — CWE-089 corpus predates evidence-gated detection

> Stage 1 artifact of the AI-native SDLC. Opened while carrying #414's rename into
> the flagship benchmark, which made a long-standing false number visible.

**Status:** shipped · **Opened:** 2026-08-26 · **Shipped:** 2026-11-07 · **Owner:** @ofri-peretz

---

## Why now

All six fixtures in `benchmarks/corpus/CWE-089/{safe,vulnerable}/` call a bare,
undeclared `db.query(...)` with no driver import. Measured side by side on identical
files:

| package                                             | fires on `vulnerable/` |
| :-------------------------------------------------- | :--------------------- |
| `eslint-plugin-pg@1.4.14` (frozen, pre-rename)      | 3 / 3                  |
| `eslint-plugin-postgresql-security@2.2.1` (shipped) | 0 / 3                  |

This is **not a plugin regression.** The old rule fired on the _name_ `.query`; the
current rule requires evidence the receiver is a pg client, which is the deliberate
"evidence, not names" hardening the plugin's own doctrine describes. Adding
`import { Pool } from 'pg'` to a fixture makes 2.2.1 fire correctly — verified.

The corpus was written for the name-based rule and never updated. Until #747 the
ILB-flagship benchmark still installed `eslint-plugin-pg@*` from npm, so it scored the
frozen pre-rename package and published **F1 = 1.00 for something we do not ship**.
Pointing the benchmark at the shipped package made the number honest and turned the
row red.

## What is wanted

The CWE-089 corpus exercises what the shipped rule is built to detect, and the
published number is true of the package a user installs. Whatever we choose, the
reasoning is written down here rather than inferred later from a diff.

## Affected users and systems

`benchmarks/corpus/CWE-089/**`, the `ilb-flagship` smoke gate, `ilb-cwe-corpus`, and
`ilb-arena` — the corpus is shared, and competitors are scored on the same files.
Downstream: `BENCHMARK-RESULTS.md` and every published claim derived from it.

## Constraints

- **Competitors are scored on these fixtures.** A change must be defensible as making
  the fixture more representative of real node-postgres code, not as tuning our score.
- Published numbers move. Anything already asserted in an article or on the docs site
  has to be re-derived, per `article_integrity_bugs` discipline.
- Do not weaken `no-unsafe-query` back to name-based matching. The FP reduction was
  the point, and the doctrine in every README now promises it.

## Success criteria

- `npm run ilb:flagship:smoke` is green on `pg/no-unsafe-query` for a reason that is
  written down, not because the assertion was loosened.
- Every CWE corpus has been checked for the same shape, and each one either carries
  driver evidence or is recorded here as a documented known-miss.
- `BENCHMARK-RESULTS.md` and any published article citing a CWE-089 number are
  re-derived from the shipped package, with the old number and its replacement both
  stated.

## Open questions

- Add the driver import to the existing fixtures, or add a second evidence-bearing
  set and keep the bare ones as a documented known-miss?
- Do the other CWE corpora share this shape? Any corpus written before the
  evidence gating may be measuring a rule we no longer ship.
- Should the flagship smoke gate stay red until this is settled, or should the row be
  marked known-failing with a link to this intent?

## Re-checked 2026-09-02

**Still open. Verified rather than assumed:** none of the CWE-089 vulnerable
fixtures imports `pg`.

```
dynamic-column.js      pg-import=NO
string-concat.js       pg-import=NO
template-literal.js    pg-import=NO
```

The evidence-gated rule therefore cannot fire on any of them, and the flagship
benchmark scores this corpus at zero for a reason that has nothing to do with
detection quality.

## Closed — 2026-11-07

Shipped. The open question is decided as **add the driver import to the
existing fixtures**: `const { Pool } = require('pg'); const db = new Pool();`
in all six of the original files. That is what every real node-postgres file
does, and the competitor fixtures #1201 added already did it. The fixtures stay
`@author`-ed (they predate ADR 0002). The edit adds the evidence a real call
site carries and changes no query.

Evidence against the success criteria:

- `pg/no-unsafe-query` on `benchmarks/corpus/CWE-089/` with the shipped rule
  (ESLint API, built `eslint-plugin-postgresql-security`): vulnerable 1/4 → 4/4,
  safe 0/4 flagged before and after. The smoke assertion was not touched;
  the scorer will read recall 100% and F1 1.00.
- Every CWE corpus was checked for the same shape: a call on an undeclared
  receiver with no import or require. Only CWE-943 has it (4 files, bare `db`).
  `mongodb-security/no-unsafe-query` does not gate on a driver import and fires
  on `user-input-in-find.js` as it is. Its miss on `where-string.js` (`$where`
  through a template literal) is a known detection miss, already published as
  such in the "ground truth" article, not a missing-evidence artefact.
- Published numbers: the 2026-11-06 flagship scorecard published CWE-089 at
  recall 25%, F1 0.40 (TP 1, FN 3). The weekly benchmark regenerates
  `ilb-flagship-scorecard.md` from the corpus, so the next run replaces it.
  No blog article cites a pg CWE-089 figure (the blog repo was grepped), so
  nothing else needs re-deriving.
