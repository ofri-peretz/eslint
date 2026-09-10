---
'eslint-plugin-react-features': patch
'eslint-plugin-reliability': patch
---

fix: two rules that could not report anything

**`react-features/static-property-placement` now works.** Its grouping check ended in an empty `if` — the `context.report` had been deleted alongside a genuinely unreachable branch beside it, leaving a condition whose answer nobody used. The rule ships under two export names, so a config that enables every rule of every plugin got it at `error` and never heard from it. Its 21 `valid` cases all passed, and none of them could have failed: a rule with no `context.report` satisfies every valid case ever written for it.

The question it asked was wrong too. Two **adjacent** static properties from different groups is what correct grouping looks like; the defect is a group **resuming** after another group came between it and its earlier members. That is now what it reports. A static property belonging to no configured group does not break a group — nothing says it does not belong there. `static [propTypes] = {}` is also no longer read as the property `propTypes`; a computed key is whatever the variable holds.

**`reliability/no-jsdoc-terminator-in-example` is deprecated.** It looks for `*/` inside a JSDoc `@example`, and a block comment ends at its _first_ `*/` — so a comment's value can never contain one. Constructing the case produces a parse error, not a finding. Nothing you can write will make this rule fire, which is why it has no defect cases. Remove it from your config; `findTerminatorsInExamples` remains exported and unit-tested.
