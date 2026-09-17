---
'eslint-plugin-conventions': patch
---

fix: `no-magic-numbers` no longer offers a suggestion that fails to parse

In a braceless single-statement body — `if (col.border) wrapWidth -= 4;` and the `while`/`for`/`else`/labelled equivalents — the extraction suggestion inserted the constant before a statement that is not an element of a statement list, producing `if (col.border) const MAGIC_4 = 4;`. That is `SyntaxError: Unexpected token 'const'` (TS1156), and it also hoisted the guarded statement out of its conditional so it ran unconditionally (TypeScript's own control-flow analysis reports the escape as TS2454). ESLint's rule-tester asserts that an applied suggestion must not produce a parse error, as a requirement written separately from and identically to the one for autofixes, so `suggestion`-not-`fix` does not excuse it — and this rule already treated the same failure mode as a bug once, for `const MAGIC_1e+21`. The suggestion is now withheld when the constant has nowhere legal to go; the report itself still fires. Note the rule-tester's parse guard does not catch this under the TypeScript parser, which recovers from TS1156, so the new fixture asserts the absence of the suggestion explicitly.
