// Model of eslint-plugin-import-next/no-webpack-loader-syntax
// (import/no-webpack-loader-syntax).
// A `!` in a module specifier configures webpack loaders inline
// (`style!css!./a.css`, `-babel-loader!lodash`): the module then builds only
// under webpack, and its loader chain hides from the webpack config. Every
// way a module is loaded or re-exported is checked, type-only imports
// included. Specifiers with no `!` - relative files, packages, scoped
// package subpaths - are not findings.
module no_webpack_loader_syntax {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = LoaderChain | LoaderPrefix | Plain | Package | ScopedSubpath

  pure def reports(f: Form, s: Spec): bool = Set(LoaderChain, LoaderPrefix).contains(s)

  var form: Form
  var spec: Spec
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(LoaderChain, LoaderPrefix, Plain, Package, ScopedSubpath).oneOf()
    all { form' = f, spec' = s, verdict' = reports(f, s) }
  }

  action init = step
}
