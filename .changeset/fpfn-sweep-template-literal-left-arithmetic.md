---
'eslint-plugin-modernization': patch
---

fix: `prefer-template-literal` autofix turned arithmetic into concatenation

`collectParts` guarded the RIGHT operand of a `+` chain against being a non-string-producing addition, but recursed unconditionally on the LEFT. `+` is left-associative, so a nested `+` on the left is part of the same concatenation chain — but only when that sub-expression is itself string-producing. When it is not, it is arithmetic, and splitting it into two placeholders changes the value.

Measured with `i=5, w=10, h=20`, under plain `eslint --fix` (`fixable: 'code'`, no suggestion gate, exit 0, no residual report):

```
i + 1 + 'px'      ->  `${i}${1}px`       "6px"      became "51px"
w + h + ' total'  ->  `${w}${h} total`   "30 total" became "1020 total"
(i + 1) + 'px'    ->  `${i}${1}px`       "6px"      became "51px"
i + 1 + ''        ->  `${i}${1}`         "6"        became "51"
f() + 1 + 'px'    ->  `${f()}${1}px`     "4px"      became "31px"
o.n + 1 + 'px'    ->  `${o.n}${1}px`     "8px"      became "71px"
```

Explicit parentheses did not help: ESTree discards them, and the left recursion had no guard to consult.

The left branch now carries the same `isStringExpression` check the right branch already had, so a non-string-producing addition becomes one interpolation — `` `${i + 1}px` `` — which preserves the value for every operand type and needs no type information. This is the shape the rule already produced for `'row ' + (i + 1)`; the sides are now symmetric.

Reporting is unchanged; only the fix text moves. One visible output change no existing test pinned: `a + b + 'x'` now fixes to `` `${a + b}x` `` rather than `` `${a}${b}x` `` — identical when the operands are strings, correct when they are numbers.
