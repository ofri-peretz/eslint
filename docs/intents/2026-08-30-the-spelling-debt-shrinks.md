---
slug: the-spelling-debt-shrinks
opened: 2026-08-30
packages: []
cases: []
---

## What

Drain the largest untouched ratchet in the repo. **839 spelling-sensitive
sites across 278 rule files** read one spelling of a thing JavaScript writes
several ways, and the baseline has never moved.

```
 613  dotted-property-only     o.k        misses  o['k']  and  o[`k`]
 206  bare-object-key-only     {k: v}     misses  {'k': v} and {['k']: v}
  20  string-literal-only      'x'        misses  `x`
```

The devkit already answers all three — `propertyName`, `objectKeyName`,
`staticString`. The debt is that 278 files do not call them.

## Why

This is not a style ratchet. Each site is a rule that goes silent on a
meaning-preserving rewrite of a defect it was written to catch, and nobody
decided that.

`spellings.ts` measured it directly: **3,825 rewrites of known true positives
produced 1,156 cases where the rule reported the original and went silent on
the rewrite, across 163 of 470 rules.** A minifier, an obfuscator, a codegen
step, or a key that is not a valid identifier is enough to produce the second
spelling — and `String.raw` _requires_ it.

The first fix landed today by accident, as a side effect of making
`no-unsafe-buffer-alloc` configurable: one line moved from `.property.name` to
`propertyName`, and `o['length']` stopped being invisible. It was six lines and
it removed a real miss. There are 838 more.

The counter-argument this intent must answer honestly: fixing a site **widens**
detection. A rule that missed `o['location']` now reports it, and a widening is
a precision risk, not a free win. That is what makes this measured work rather
than a find-and-replace.

## Constraints

- **Each tranche is measured against the corpus before and after.** A rule made
  spelling-complete but noisier is a worse rule, and the widening direction is
  exactly where a false positive comes from.
- A site that flips a real case seals it as an FP or FN entry in the registry —
  the same rule every behaviour change here follows.
- `check:spellings` is shrink-only and must never regress while draining. A
  tranche that fixes 40 sites and introduces 1 is a failed tranche.
- Where a rule genuinely means "a quoted literal and nothing else", it keeps the
  node-type match and **says so in a comment**. That is a position and positions
  are fine; silence by omission is not. Those sites leave the baseline by being
  justified, not by being changed.
- Order by blast radius, not by file order: the probe already reports which
  rules lose the most true positives to a rewrite. Start there.

## Done when

- Spelling debt: **839 → under 400**, with every remaining site either
  justified in a comment or listed with the reason it is deferred.
- The 1,156 rewrite-silenced cases measured in `spellings.ts` are re-run and the
  new figure replaces it in that file's header.
- Precision on the ILB corpus does not fall for any rule touched, measured per
  tranche.
- No new spelling-sensitive site enters the codebase (already enforced; this
  intent must not weaken it to move faster).
