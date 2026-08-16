# Rule corpus - `secure-coding/no-redos-vulnerable-regex` (CWE-400)

**The question this corpus exists to answer:** does the rule decide from the
AUTOMATON, or from the shape of the printed pattern?

That is the whole risk profile of a ReDoS rule. Catastrophic backtracking is a
property of ambiguity in the NFA, and it correlates badly with how a pattern
looks. Two families are therefore mandatory here:

- `vulnerable/` holds patterns whose blowup was **measured on V8**, not
  asserted. Each header carries the timings.
- `safe/` holds patterns that **look** catastrophic and are provably linear -
  bounded repetition (`{1,3}` inside `{3}`), disjoint alternation, quantifiers
  separated by a mandatory literal, and the `stripe-js` origin check that a
  quantifier-counting heuristic once reported as CRITICAL.

Anything reported in `safe/` is a rule guessing from shape. Anything missed in
`vulnerable/` is a rule that cannot see real ambiguity.

## What the corpus proved

Three defects, all fixed structurally:

1. **A variable bounded range under an unbounded quantifier was invisible.**
   scslre reports `([a-zA-Z0-9]+)+` and clears `([a-zA-Z0-9]{2,4})+`, though
   both are exponential. That is exactly the Stack Overflow email validator
   (`vulnerable/02`), measured at 73ms for a 44-character input and doubling
   every four characters. Fixed by re-running the analyser on the same pattern
   with variable ranges relaxed to `{m,}`, scoped to ranges nested inside a
   quantifier whose max is Infinity - a rewrite, not a verdict.

2. **Runtime-built patterns were decided by three regexes over the printed
   template text.** `new RegExp(`^(?: {${indentSize}})+`)` (an indentation
   matcher whose inner quantifier is the fixed width `{2}`) and
   `new RegExp(`^${prefix}\d+${sep}(\.\d+)*$`)` were both reported as nested
   quantifiers. Both are linear. Fixed by substituting an inert private-use
   code point for each interpolation and running the same NFA analysis, so the
   author's structure decides.

3. **`new RegExp(x)` only ever saw `x` written inline.** A `const` holding the
   pattern, a `String.raw` template, and `'^(' + CHARS + '+)+$'` were all
   silent, though each carries a fully-determined pattern. Fixed with
   scope-based resolution of the pattern source.

## A fixture that was wrong, and how it was caught

`^(\S+\s+)+\S+$` sat in `vulnerable/` first, on the strength of looking like the
same family as `(\w+\s*)+`. Timing it says otherwise: 0.001ms at n=26. `\S+`
cannot cross whitespace and `\s+` cannot cross non-whitespace, so the split
between iterations is forced. The analyser called it clean and the analyser was
right. Replaced by `vulnerable/04`, which is measured. Shape is not evidence
here either - not for the rule, and not for the corpus author.

## Score

| wave | TP | FP | FN | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| first (8v/8s), before fixes | 6 | 2 | 2 | 75.0% | 75.0% | 75.0% |
| first, after fixes 1+2 | 8 | 0 | 0 | 100% | 100% | 100% |
| adversarial (14v/14s), before fix 3 | 11 | 0 | 3 | 100% | 78.6% | 88.0% |
| adversarial, after fix 3 | 14 | 0 | 0 | 100% | 100% | 100% |

No competitor is configured for this rule in the duel harness; the numbers are
this rule against the corpus.
