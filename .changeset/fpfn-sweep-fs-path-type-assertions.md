---
'eslint-plugin-node-security': patch
---

fix: a TypeScript type assertion no longer blanks the two CWE-22 path rules

`detect-non-literal-fs-filename` and `no-arbitrary-file-access` no longer go silent when a TypeScript type assertion sits on the tainted value. Both rules roll their own taint walker, each a `switch` on `node.type` falling through to `default: return false`, and neither had an arm for any TS-only wrapper — so `as`, `!`, `satisfies` and angle-bracket assertions all blanked the rule. That is not an exotic spelling: `process.env.X` is `string | undefined` under `strict`, so `'/etc/app/' + (process.env.NAME as string)` is the dialect TypeScript forces, and it went quiet while the docs' own worked example — the same line without the cast — is annotated "reported". The gap covered every composition form the docs name (`+`, template literal, `path.join`), and for `no-arbitrary-file-access` it also swallowed the bare whole-value form that is the rule's own Incorrect example. Both walkers now unwrap through the devkit's `unwrapTypeSyntax`, already used by the shared `makeReadsTaintSource` and seven other rules. Assertions are erased at compile time; the runtime was always byte-identical to the reported control.
