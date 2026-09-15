---
'eslint-plugin-maintainability': patch
'eslint-plugin-reliability': patch
'eslint-plugin-conventions': patch
'eslint-plugin-react-features': patch
---

FP/FN sweep against the burgee corpus — three confirmed rule defects.

- `no-silent-errors` (maintainability + reliability): `allowWithComment` only examined
  comments above the `catch` keyword, so the canonical placement — the explanation
  inside the block — could not satisfy it. The above-the-catch window is kept and a
  range-scoped scan of the block is added beside it.
- `consistent-existence-index-check` (conventions): an undocumented parent-type
  allowlist withheld the one autofix the docs promise whenever the call was nested
  (under `!`, inside `&&`, as an argument, array element, or conditional branch).
  Recovers 14 withheld autofixes on the corpus.
- `no-unnecessary-rerenders` (react-features): a multi-line prop was interpolated raw
  into the message, breaking the documented first line down to the bare token `⚡ {`.
  Whitespace is now collapsed before truncation.
