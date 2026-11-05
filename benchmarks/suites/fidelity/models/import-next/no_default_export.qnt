// Model of eslint-plugin-import-next/no-default-export.
// A convention: modules publish named exports only. The finding is anything
// that gives this module a default export: `export default ...` (value,
// function, interface), `export { x as default }` (identifier or string
// `"default"`), `export { default } from 'm'`, `export { x as default } from
// 'm'`, `export * as default from 'm'`, and TS `export = x`. Re-exporting
// another module's default UNDER A NAME (`export { default as Foo } from
// 'm'`) is exactly the named export the convention asks for; `export * from`
// does not re-export a default. allowInFiles / allowPatterns are file
// globs (`*` any run of characters) or substrings that exempt a file.
module no_default_export {
  type Form = DefaultFn | DefaultIdent | DefaultObj | DefaultInterface | AsDefault | AsDefaultString
    | ReexportDefault | ReexportDefaultAs | ReexportAsDefault | ExportAllAsDefault | ExportAssign
    | Named | ExportAll
  type Opts = Defaults | AllowInFilesMatch | AllowInFilesOther | AllowPatternsMatch

  pure def isDefault(f: Form): bool = not(Set(ReexportDefaultAs, Named, ExportAll).contains(f))

  var form: Form
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(DefaultFn, DefaultIdent, DefaultObj, DefaultInterface, AsDefault, AsDefaultString,
      ReexportDefault, ReexportDefaultAs, ReexportAsDefault, ExportAllAsDefault, ExportAssign,
      Named, ExportAll).oneOf()
    nondet o = Set(Defaults, AllowInFilesMatch, AllowInFilesOther, AllowPatternsMatch).oneOf()
    all { form' = f, opts' = o,
          verdict' = (isDefault(f) and Set(Defaults, AllowInFilesOther).contains(o)) }
  }

  action init = step
}
