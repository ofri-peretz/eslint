// Model of eslint-plugin-import-next/no-named-export.
// A convention: a module publishes a default export only. The finding is
// every VALUE named export: `export const/function/class/enum`, a
// destructured `export const { a } = o`, an export list (also renamed, also
// a string name `export { b as "a" }`), `export { a } from 'm'`, `export *
// from 'm'` and `export * as a from 'm'`. Not findings: anything exported as
// `default`, type-only exports (`export type`, `export interface`, `export
// type { T }`, `export { type T }`), and a bare `export {}`. allowNames
// exempts an export by its exported name (`export * from` has none);
// allowInFiles / allowPatterns exempt a file by glob or substring.
module no_named_export {
  type Form = Const | Fn | Klass | Enum | Destructured | Specifier | Renamed | StringNamed
    | AsDefault | ReexportDefault | ReexportNamed | ExportAll | ExportAllAs
    | TypeAlias | Interface | TypeSpecifier | InlineTypeSpecifier | EmptyExport | DefaultFn
  type Opts = Defaults | AllowNamesMatch | AllowInFilesMatch | AllowInFilesOther | AllowPatternsMatch

  pure def named(f: Form): bool =
    Set(Const, Fn, Klass, Enum, Destructured, Specifier, Renamed, StringNamed,
        ReexportNamed, ExportAll, ExportAllAs).contains(f)

  pure def reports(f: Form, o: Opts): bool =
    named(f) and (o == Defaults or o == AllowInFilesOther or (o == AllowNamesMatch and f == ExportAll))

  var form: Form
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Const, Fn, Klass, Enum, Destructured, Specifier, Renamed, StringNamed,
      AsDefault, ReexportDefault, ReexportNamed, ExportAll, ExportAllAs,
      TypeAlias, Interface, TypeSpecifier, InlineTypeSpecifier, EmptyExport, DefaultFn).oneOf()
    nondet o = Set(Defaults, AllowNamesMatch, AllowInFilesMatch, AllowInFilesOther, AllowPatternsMatch).oneOf()
    all { form' = f, opts' = o, verdict' = reports(f, o) }
  }

  action init = step
}
