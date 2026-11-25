// Model of eslint-plugin-import-next/no-duplicates (import/no-duplicates).
// Two import statements of the SAME module in one scope are duplicates when
// they land in the same one of eslint-plugin-import's four buckets:
//   - value imports: named, default, side-effect;
//   - namespace imports: `import * as ns` cannot share a statement with
//     `{ a }`, so it is a duplicate only of another namespace import;
//   - type-only named imports: `import type { T }`, and an import with an
//     inline `type` specifier (`import { type T }`), which merge as inline
//     types;
//   - type-only defaults: `import type D` cannot share a statement with
//     `import type { A }` (TypeScript rejects `import type D, { A }`).
// `import type` beside a value import is NOT a duplicate: the type-only form
// is erased, and folding it into the value import changes what is emitted.
// Both statements of a duplicate are reported.
// The SAME module is the file the resolver sees: './m' and './m.js' (TS
// source m.ts) and './m' and './m/index' name one file; './m?raw' is a
// different module to a bundler, and './other' is another file.
// Scope: imports in two different `declare module 'x' {}` blocks of a .d.ts
// belong to two ambient modules - not a duplicate; two in one block are.
module no_duplicates {
  type Form = Named | Default | Namespace | SideEffect | TypeOnly | TypeDefault | InlineType
  type Relation = Same | Other | Query | ExtJs | Index
  type Scope = TopLevel | SplitModules | OneModuleBlock
  type Focus = Forms | Relations | Scopes

  pure def bucket(f: Form): int =
    if (Set(Named, Default, SideEffect).contains(f)) 0
    else if (f == Namespace) 1
    else if (Set(TypeOnly, InlineType).contains(f)) 2
    else 3
  pure def duplicate(a: Form, b: Form): bool = bucket(a) == bucket(b)
  pure def sameModule(r: Relation): bool = Set(Same, ExtJs, Index).contains(r)
  pure def reports(a: Form, b: Form, r: Relation, s: Scope): bool =
    duplicate(a, b) and sameModule(r) and s != SplitModules

  var focus: Focus
  var first: Form
  var second: Form
  var relation: Relation
  var scope: Scope
  var verdict: bool

  action step = {
    nondet fo = Set(Forms, Relations, Scopes).oneOf()
    val all7 = Set(Named, Default, Namespace, SideEffect, TypeOnly, TypeDefault, InlineType)
    nondet a = (if (fo == Forms) all7 else Set(Named)).oneOf()
    nondet b = (if (fo == Forms) all7
                else if (fo == Relations) Set(Named, Default, SideEffect)
                else Set(Named)).oneOf()
    nondet r = (if (fo == Relations) Set(Other, Query, ExtJs, Index) else Set(Same)).oneOf()
    nondet s = (if (fo == Scopes) Set(SplitModules, OneModuleBlock) else Set(TopLevel)).oneOf()
    all { focus' = fo, first' = a, second' = b, relation' = r, scope' = s,
          verdict' = reports(a, b, r, s) }
  }

  action init = step
}
