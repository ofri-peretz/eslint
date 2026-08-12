---
'eslint-plugin-secure-coding': minor
---

`no-redos-vulnerable-regex`: an invalid regex is no longer reported as a ReDoS
vulnerability, and the heuristic layer that did so is removed.

`new RegExp("(a+")` is a real bug, but it is not *this* bug: it throws at
construction and can never backtrack. The rule reported it as
`Nested Quantifier Pattern: exponential backtracking | CRITICAL`, because the
removed layer matched the pattern **text** against a table of quantifier
shapes and found `(a+` convincing. Parse failure is now terminal — no report.

With that separation made, the heuristic layer had nothing left to do: a
pattern either fails to parse (not a regex) or reaches the NFA analyser (which
returns a verdict). Its only remaining effect was overruling clean verdicts, so
it is gone, along with the `useAtomicGroups`, `usePossessiveQuantifiers`,
`restructureRegex` and `useSafeLibrary` suggestions it produced.

`allowCommonPatterns` is accepted and ignored rather than removed, so configs
that set it keep loading. It gated the deleted layer. Removed in the next major.

`maxPatternLength` is unaffected. Catastrophic patterns are unaffected:
`/(a+)+b/`, `/(a+)(a+)b/`, `/(a+)+$/` and `/(\w+\s?)*$/` all still report.
