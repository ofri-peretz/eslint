// Model of eslint-plugin-import-next/no-mutable-exports.
// An exported `let` / `var` is a live binding: importers see the module's
// later reassignments. The finding is a module-level `let` / `var` binding
// this module exports by name: inline (also destructured), through an export
// list, renamed, or as `default` (`export { x as default }` exports the
// binding). Not: `const`; `export default x` (exports the value at that
// moment); a re-export from another module; an imported binding re-exported.
// `ignoreExports` names exported names to skip; `allowInFiles` lists file
// patterns (a substring, or a glob where `*` matches within a segment and
// `**` across segments) that are exempt.
module no_mutable_exports {
  type Kind = Const | Let | Var
  type Form = Inline | Destructured | Specifier | Renamed | AsDefault | DefaultExpr | Reexport | ImportedReexport
  type Opts = Defaults | IgnoreName | IgnoreOther | AllowSubstring | AllowGlob | AllowOther

  pure def exportsBinding(f: Form): bool = Set(Inline, Destructured, Specifier, Renamed, AsDefault).contains(f)

  pure def reports(k: Kind, f: Form, o: Opts): bool =
    k != Const and exportsBinding(f) and Set(Defaults, IgnoreOther, AllowOther).contains(o)

  var kind: Kind
  var form: Form
  var opts: Opts
  var verdict: bool

  action step = {
    nondet k = Set(Const, Let, Var).oneOf()
    nondet f = Set(Inline, Destructured, Specifier, Renamed, AsDefault, DefaultExpr, Reexport, ImportedReexport).oneOf()
    nondet o = Set(Defaults, IgnoreName, IgnoreOther, AllowSubstring, AllowGlob, AllowOther).oneOf()
    all { kind' = k, form' = f, opts' = o, verdict' = reports(k, f, o) }
  }

  action init = step
}
