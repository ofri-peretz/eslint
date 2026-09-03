# Intent — 195 object-key sites sit outside the only instrument that measures blindness

> Stage 1 artifact. Opened after reconciling the spelling-site count against
> the computed-key probe and finding they disagree by two orders of magnitude.

**Status:** draft · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

Every spelling a rule can be blind to is measured by rewriting a case and
re-running the rule, not by counting the shapes in its source.

## Why now

Two numbers describe the same defect class and disagree wildly:

| instrument                                         |    says |
| :------------------------------------------------- | ------: |
| `check:spellings` — counts SITES in rule sources   | **331** |
| `check:computed-keys` — rewrites cases and re-runs |   **1** |

The site count is a proxy and has always been labelled one; three conversions
made to satisfy it had to be reverted because the sites were behind guards that
made them unreachable. The probe is the real measure.

But the probe does not cover what the count is mostly counting. Its rewrites
are `obj.method(` → `obj["method"](` and `obj.prop` → `obj["prop"]`. **It never
rewrites an object literal key.** Of the 331 sites:

```
195  bare-object-key-only    { k: v }  vs  { ['k']: v }   NOT PROBED
117  dotted-property-only    o.k       vs  o['k']         probed
 19  string-literal-only     'sha1'    vs  a resolved constant   NOT PROBED
```

So 214 of 331 sites are outside the instrument, and the reassuring "1 rule goes
silent" describes only the 117 the probe can reach.

This is not hypothetical. Extending the same probe from calls to reads earlier
tonight took its reach from 282 to 349 rules and found **22 real blind spots**
in rules that had been reporting clean. The object-key extension is the same
move against a larger population.

## Constraints

- **`{ ['k']: v }` is the same property as `{ k: v }`**, and minifiers emit the
  first. `objectKeyName` in the devkit already resolves all four spellings; the
  gap is that nothing checks whether rules use it.
- **A key computed at RUNTIME — `{ [k]: v }` — names nothing**, and a rule must
  keep abstaining there. Every widening this quarter has had to pin that.
- **The rewrite must not touch destructuring patterns**, where `{ k }` is a
  binding rather than a property, and `{ ['k']: v }` is not equivalent.
- **Expect the count to rise.** A probe extension that finds nothing has
  almost certainly not extended.

## Success criteria

- **Now:** 331 sites counted · 117 probed · 1 blind rule known · 214 sites
  unmeasured by any direct instrument.
- **Wanted:** object keys rewritten and re-run, so the blind count covers them.
- **Breach:** a spelling class counted by `check:spellings` that the probe
  cannot exercise.
- **Proven by:** the probed-case count rising, and every rule the extension
  finds either fixed or recorded in the baseline with a reason.
