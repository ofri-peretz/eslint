---
'eslint-plugin-import-next': minor
---

fix: `no-cycle` no longer reports a cycle whose edge is erased before emit

A stratified sample of this rule's findings on the pinned corpus (n=24, four
repos) came back **16 type-only against 8 runtime — two thirds of what it
reported could not happen.** All sixteen were plain
`import { SomeInterface } from './x'` where every binding is an
`export interface` or `export type`. TypeScript erases those, so the bundle
bloat and initialization hazard this rule's own message describes cannot occur
through that edge.

The rule already conceded the principle — it skipped `import type` under the
comment "erased at compile time — no runtime cycle risk". It could not see an
*implicitly* type-only named import, and on real TypeScript that was most of
what it found.

**Biased to report.** This rule is `error` in `recommended`, so a missed runtime
cycle is a shipped initialization bug. Every ambiguity resolves to "runtime":
declaration merging (`export interface Foo` beside `export const Foo`), a
re-export, a default or namespace import, or a target that cannot be read.

Measured against that sample: **8/8 runtime cycles still reported, 16/16
type-only silenced.**

### Compiler settings

Under `verbatimModuleSyntax`, a plain named import of a type is already a
compile error, so such projects write `import type` and are unaffected.

**One exception, stated rather than handled.** With
`importsNotUsedAsValues: "preserve"` (TypeScript 4.8–5.4) the import statement
is kept, so the target module *is* executed and the runtime edge genuinely
exists — this change will not report it. A lint rule cannot see that setting
without reading `tsconfig.json`, which this one does not do. The exception is
narrow and shrinking: the flag is deprecated in TypeScript 5.0 and removed in
5.5, superseded by `verbatimModuleSyntax`. If you are on `preserve` and rely on
this rule, pin to the previous minor until you migrate.
