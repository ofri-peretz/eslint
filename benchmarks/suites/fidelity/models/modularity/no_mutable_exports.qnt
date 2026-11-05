// Model of eslint-plugin-modularity/no-mutable-exports.
// An exported `let` / `var` is a live binding: every importer sees the
// exporting module's later reassignments. The rule reports a module-level
// `let` or `var` binding that the module exports by name - inline
// (`export let x`) or through an export list (`export { x }`, `export { x as
// y }`), since both export the same live binding. It does not report:
//   - `const`, function and class declarations;
//   - `export default x`, which exports the value, not the binding;
//   - a re-export from another module (`export { x } from './state'`): the
//     declaration is not in this file (documented known false negative);
//   - a `let` that is not exported.
module no_mutable_exports {
  type Kind = Const | Let | Var | Function | Class
  type Form = Inline | Specifier | RenamedSpecifier | DefaultExport | Reexport | NotExported

  pure def reports(k: Kind, f: Form): bool =
    Set(Let, Var).contains(k) and Set(Inline, Specifier, RenamedSpecifier).contains(f)

  var kind: Kind
  var form: Form
  var verdict: bool

  action step = {
    nondet k = Set(Const, Let, Var, Function, Class).oneOf()
    nondet f = Set(Inline, Specifier, RenamedSpecifier, DefaultExport, Reexport, NotExported).oneOf()
    all { kind' = k, form' = f, verdict' = reports(k, f) }
  }

  action init = step
}
