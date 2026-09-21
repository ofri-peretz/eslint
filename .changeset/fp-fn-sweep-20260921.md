---
'eslint-plugin-react-features': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-reliability': patch
'eslint-plugin-maintainability': patch
---

fix: five FP/FN rule defects found by the burgee sweep

Each was adversarially verified against the rule's own documented contract
before a line was changed.

- `react-features/hooks-exhaustive-deps`: the hook callback's own parameters
  were reported as missing dependencies, and the suggestion's fixer rewrote
  working code into a `ReferenceError`.
- `secure-coding/no-redos-vulnerable-regex`: `(?:a|a)+` escaped the
  identical-alternatives detector because its regex swallowed the `?:`, and
  every `/v` pattern using a `\p{...}` escape was silently dropped as
  "unparseable" because `unicodeSets` never reached the analyser.
- `secure-coding/detect-object-injection`: a counter declared in a `for` head
  was cleared on its declaration alone, so reassigning it from user input
  inside the loop body went unreported.
- `reliability/no-unhandled-promise` and the `maintainability` fork of the same
  rule: appending `.finally(cleanup)` silenced the chain, though `.finally`
  does not handle a rejection.
