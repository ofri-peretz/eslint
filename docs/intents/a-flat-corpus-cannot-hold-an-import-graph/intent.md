# Intent — six rules cannot be measured because the corpus has no directories

> Stage 1 artifact. Opened after a SpringRoll barrel fixture was cut, verified
> not to fire, and deleted.

**Status:** draft · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

A rule whose subject is the relationship BETWEEN files can be measured by the
corpus, or the corpus says plainly that it cannot hold such a rule.

## Why now

The corpus stores one flattened file per fixture. Six of the 99 reachable
unmeasured rules read an import graph and cannot work in that shape:

```
import-next/no-barrel-file          4,669 findings on real code
import-next/no-cycle               11,415
import-next/no-relative-packages    8,521
import-next/no-self-import
import-next/no-cross-domain-imports
import-next/no-named-as-default
```

They are not marginal. `no-cycle` and `no-relative-packages` are among the
highest-firing rules in the entire suite — 11,415 and 8,521 findings across 113
repositories — and both are unmeasurable by the instrument that scores this
product's detection quality.

The failure is silent and worse than a miss. In a single-file corpus the
imports resolve to nothing, so the target rule stays quiet AND
`import-next/no-unresolved` fires roughly eleven times on the same fixture. A
barrel fixture cut from SpringRoll did exactly this and was deleted rather than
committed, because a fixture whose target rule does not fire is worthless and a
fixture that fires the WRONG rule is worse than worthless.

## Constraints

- **Not a corpus rewrite.** `benchmarks/corpus/` holds hundreds of working
  single-file fixtures across CWE categories; changing their shape to serve six
  rules would be a poor trade.
- **`no-unresolved` noise is the tell.** Any design must be checked against it:
  a multi-file fixture that still leaves imports dangling has not fixed
  anything.
- **The scorer reads the corpus.** `recall-gate.ts` and the CWE scorer both
  consume these fixtures, and their per-CWE false-positive budget is zero.
- **Six rules do not justify unbounded machinery.** If the honest answer is
  "these are measured by the real-source scan and not by the corpus", that is
  an acceptable outcome — recorded rather than left as a silent hole.

## Success criteria

- **Now:** 6 reachable rules unmeasurable · 1 fixture cut and deleted · the
  limitation recorded only in a branch note.
- **Wanted:** either the corpus holds a multi-file fixture whose target rule
  fires and whose imports resolve, or `check-corpus-coverage` classifies these
  six as out of its reach and says why.
- **Breach:** a fixture committed for one of these six that fires
  `no-unresolved` instead of its target.
- **Proven by:** cutting one fixture for `no-cycle` and demonstrating the rule
  reports on it with zero `no-unresolved` findings — or demonstrating that it
  cannot, and recording that instead.
