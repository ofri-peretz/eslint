// Model of eslint-plugin-import-next/no-full-package-import.
// For a package the user lists in `blockedPackages`, binding the whole
// package object defeats tree-shaking. The rule reports a binding of the
// whole listed package (its exact name, not a subpath): a default import,
// a namespace import, `const x = require('pkg')` and `import x = require('pkg')`.
//
// Not a finding: named imports, type-only imports (erased: they bundle
// nothing), side-effect imports, re-exports by name or `export *`, a subpath
// (`pkg/sub`, the recommended form), a different package sharing a prefix.
//
// Left out: candidate for change (fires on a guess). The default
// `blockedPackages` is a built-in list of packages the rule judges large
// (lodash, moment, rxjs, aws-sdk, ...): an opinion list, not something the
// code proves. The model samples configured lists only.
// Left out (judgment): `import('pkg')`, `export * as ns from 'pkg'` and
// `const { a } = require('pkg')` - whether the bundler keeps the whole
// package depends on how the binding is used later.
module no_full_package_import {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | TypeDefault | DefaultAndNamed
    | SideEffect | ExportNamed | ExportAll | Require | ImportEquals
  type Spec = Exact | Subpath | PrefixTwin | ScopedExact
  // blockedPackages: [big, @big/icons] / [].
  type Config = Configured | Empty

  pure def reports(f: Form, s: Spec, c: Config): bool =
    c == Configured and Set(Exact, ScopedExact).contains(s)
      and Set(Default, Namespace, DefaultAndNamed, Require, ImportEquals).contains(f)

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, TypeDefault, DefaultAndNamed,
      SideEffect, ExportNamed, ExportAll, Require, ImportEquals).oneOf()
    nondet s = Set(Exact, Subpath, PrefixTwin, ScopedExact).oneOf()
    nondet c = Set(Configured, Empty).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
