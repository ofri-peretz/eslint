// Model of eslint-plugin-import-next/default (import/default).
// A default import of a module with no default export is reported:
// `import x from './dep'`, `import x, { a } from './dep'`,
// `import { default as x } from './dep'`, `export { default } from './dep'`.
// The module has a default when TypeScript sees one: `export default`,
// `export { v as default }`, a re-exported default
// (`export { default } from './inner'`), or CommonJS `module.exports =`
// (default interop). `export * from` does NOT re-export a default.
// Silent: a module that does not resolve, a namespace import
// (`import * as x`), and `import type x` (TypeScript checks it; documented
// scope). Needs type information; without it the rule is silent.
module default {
  type Target = DefaultDecl | DefaultSpecifier | ReexportDefault | CommonJs
              | NamedOnly | StarOnly | Unresolved
  type Form = DefaultImport | DefaultWithNamed | DefaultAsNamed | ExportDefaultFrom
            | Namespace | TypeOnly

  pure def hasDefault(t: Target): bool =
    Set(DefaultDecl, DefaultSpecifier, ReexportDefault, CommonJs).contains(t)
  pure def reports(t: Target, f: Form): bool =
    not(hasDefault(t)) and t != Unresolved
    and Set(DefaultImport, DefaultWithNamed, DefaultAsNamed, ExportDefaultFrom).contains(f)

  var target: Target
  var form: Form
  var verdict: bool

  action step = {
    nondet t = Set(DefaultDecl, DefaultSpecifier, ReexportDefault, CommonJs,
                   NamedOnly, StarOnly, Unresolved).oneOf()
    nondet f = Set(DefaultImport, DefaultWithNamed, DefaultAsNamed, ExportDefaultFrom,
                   Namespace, TypeOnly).oneOf()
    all { target' = t, form' = f, verdict' = reports(t, f) }
  }

  action init = step
}
