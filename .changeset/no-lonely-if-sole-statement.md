---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `no-lonely-if` requires the `if` to actually be alone

`isLonelyIf` checked that the parent block is an `else` block and stopped, so
an `if` at any position in any multi-statement `else` was reported. With
siblings present the rule's own advice — "Replace with else if" — would strand
them, so every one of those reports shipped guidance that cannot be followed.

The rule's docs state the contract four times: "a 'lonely if' occurs when an
`if` statement is the **only** statement inside an `else` block". ESLint core's
`no-lonely-if` and unicorn's both gate on the `body.length === 1` check this
rule was missing. On the burgee corpus: 42 reports to 0, none of which were on
an else block holding a sole `if`.
