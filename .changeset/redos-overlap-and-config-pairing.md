---
'eslint-plugin-secure-coding': patch
'eslint-plugin-import-next': patch
---

fix: implement the overlap half of no-redos-vulnerable-regex, and stop a config pair from erasing no-cycle findings

`no-redos-vulnerable-regex` documented "Identical — **or overlapping** —
alternatives" but only ever implemented the identical half, by matching the
source text. It now decides on the parsed pattern: for `(A|B)+` where the
branches are single character classes, it intersects their character sets with
`refa`, so `(\w|\d)+` (1,927 ms, `\d ⊆ \w`) and a six-way `\p{...}` alternation
(9,395 ms) are reported, while disjoint branches such as `(a|b)+` and
`(?:\p{Nd}|\p{Lu})+` stay silent. It declines rather than guesses on anything
it cannot decide.

`import-next`'s `strict` and `typescript` configs ran `no-cycle` at `error`
alongside `consistent-type-specifier-style` at its `prefer-inline` default,
whose autofix rewrites the import spelling `no-cycle` reports into the one it
treats as erased — so `--fix` could silence a detected cycle. Both configs now
pin `prefer-top-level`, locked by a test.
