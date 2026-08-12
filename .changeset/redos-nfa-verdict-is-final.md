---
'eslint-plugin-secure-coding': patch
---

`no-redos-vulnerable-regex` no longer overrules its own NFA analysis with
character-counting heuristics.

Measured over the 8-repo corpus scan: **61 findings → 35**, with every survivor
NFA-confirmed. The reported false positive is gone —
`stripe/stripe-js` `src/shared.ts` goes from 3 findings to 0.

The rule runs `scslre` (the NFA analyser `eslint-plugin-regexp` uses) and then
falls back to a table of regexes-matching-regex-source. Those two layers
communicated through a boolean, so "scslre analysed this and it is safe" and
"scslre could not analyse this" were the same value — and every pattern the NFA
cleared was handed straight to the heuristics, which then reported it anyway.

That is how

```js
const V3_URL_REGEX = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
```

was reported as `Nested Quantifier Pattern: exponential backtracking | CRITICAL`.
It is anchored at both ends, has two independent optional groups, no nesting,
and is linear. The heuristic `\([^)]*[+*?][^)]*\)[+*?]` matched only because
`(\?.*)?` contains a `?`, a `*`, and a trailing `?`: quantifier characters
counted, not quantifier nesting.

`checkWithScslre` now returns `reported` / `clean` / `unanalysable`, and the
heuristics run only on `unanalysable`. `new RegExp("…")` with a string literal
gets the same NFA analysis as a `/…/` literal — it previously skipped straight
to the heuristics, so the Stripe shape written as a constructor call produced
the identical false positive. Flags passed as the second argument now reach the
analyser, which matters because `i` changes what a quantifier can consume.

Catastrophic patterns are unaffected: `/(a+)+$/` and `/(\w+\s?)*$/` still
report, as do `/(a+)+b/` and `/(a+)(a+)b/`.

Three fixtures that asserted `/(a|b)+c/`, `/.*.*/` and `/(a+)?/` were *invalid*
existed to reach the heuristic layer for coverage, and in doing so pinned three
false positives. All three are linear; they are `valid` locks now.
