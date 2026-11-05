// Model of eslint-plugin-import-next/no-duplicates (import/no-duplicates).
// Two import statements of the SAME module in one scope are a duplicate when
// they could be one statement, or one of them adds nothing:
//   - two value imports (named, default, inline `type`, side-effect,
//     namespace) of one module, EXCEPT a namespace import beside a named or
//     inline-type import: `import * as ns, { a }` is not valid syntax, so the
//     two cannot be merged and neither is redundant;
//   - two `import type` statements of one module.
// `import type` beside a value import is NOT a duplicate: the type-only form
// is erased, and folding it into the value import changes what is emitted.
// The SAME module is the file the resolver sees: './m' and './m.js' (TS
// source m.ts) and './m' and './m/index' name one file; './m?raw' is a
// different module to a bundler, and './other' is another file.
// Scope: imports in two different `declare module 'x' {}` blocks of a .d.ts
// belong to two ambient modules - not a duplicate; two in one block are.
module no_duplicates {
  type Form = Named | Default | Namespace | SideEffect | TypeOnly | InlineType
  type Relation = Same | Other | Query | ExtJs | Index
  type Scope = TopLevel | SplitModules | OneModuleBlock
  type Focus = Forms | Relations | Scopes

  pure def isType(f: Form): bool = f == TypeOnly
  pure def unmergeable(a: Form, b: Form): bool =
    (a == Namespace and Set(Named, InlineType).contains(b))
    or (b == Namespace and Set(Named, InlineType).contains(a))
  pure def duplicate(a: Form, b: Form): bool =
    if (isType(a) or isType(b)) isType(a) and isType(b)
    else not(unmergeable(a, b))
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
    val all6 = Set(Named, Default, Namespace, SideEffect, TypeOnly, InlineType)
    nondet a = (if (fo == Forms) all6 else Set(Named)).oneOf()
    nondet b = (if (fo == Forms) all6
                else if (fo == Relations) Set(Named, Default, SideEffect)
                else Set(Named)).oneOf()
    nondet r = (if (fo == Relations) Set(Other, Query, ExtJs, Index) else Set(Same)).oneOf()
    nondet s = (if (fo == Scopes) Set(SplitModules, OneModuleBlock) else Set(TopLevel)).oneOf()
    all { focus' = fo, first' = a, second' = b, relation' = r, scope' = s,
          verdict' = reports(a, b, r, s) }
  }

  action init = step
}
