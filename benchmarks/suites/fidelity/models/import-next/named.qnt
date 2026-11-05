// Model of eslint-plugin-import-next/named (import/named).
// A named import or named re-export of a name the target module does not
// export is reported: `import { a } from './dep'`, `import { a as x }`,
// `import { type a }`, `export { a } from './dep'`, `export { a as x } from`.
// The module's exports are what TypeScript sees: a direct export, a renamed
// export (`export { v as a }`), one reached through `export * from`, and a
// type export all count. A name exported only as the default is missing.
// Silent: a module that does not resolve (nothing proves the name is
// missing); `import type { a }` statements, which TypeScript itself checks
// (documented scope); `import { default as x }`, which is the `default`
// rule's to judge (one finding, not two).
// Needs type information; without it the rule is silent.
module named {
  type Target = ExistsConst | ExistsViaStar | ExistsRenamedExport | ExistsTypeOnly
              | Missing | OnlyDefault | Unresolved
  type Form = Named | Renamed | InlineType | TypeOnly | ExportNamed | ExportRenamed | DefaultAsNamed

  pure def reports(t: Target, f: Form): bool =
    Set(Missing, OnlyDefault).contains(t) and not(Set(TypeOnly, DefaultAsNamed).contains(f))

  var target: Target
  var form: Form
  var verdict: bool

  action step = {
    nondet t = Set(ExistsConst, ExistsViaStar, ExistsRenamedExport, ExistsTypeOnly,
                   Missing, OnlyDefault, Unresolved).oneOf()
    nondet f = Set(Named, Renamed, InlineType, TypeOnly, ExportNamed, ExportRenamed, DefaultAsNamed).oneOf()
    all { target' = t, form' = f, verdict' = reports(t, f) }
  }

  action init = step
}
