// Model of eslint-plugin-import-next/max-dependencies.
// A module that depends on too many external packages is doing too much.
// The rule counts the distinct external packages a file loads or re-exports
// (by package name: `lodash` and `lodash/get` are one package, so are
// `@s/p` and `@s/p/x`) and reports the file when the count exceeds `max`
// (default 10). Not counted: relative and absolute paths, `#` subpath imports
// (the package's own files), Node.js builtins in any spelling (`fs`,
// `node:fs`, `fs/promises`, `worker_threads`), a specifier listed in
// `ignoreImports`, and - with `ignoreTypeImports` (default true) - a
// statement-level `import type`. Files matching `ignoreFiles` are skipped.
//
// Each input is a file that already loads exactly `max` packages, plus one
// probe import: the file is reported iff the probe counts as a new package.
//
// Left out (judgment): `import { type T } from 'p'` with `ignoreTypeImports` -
// whether the statement survives compilation depends on
// `verbatimModuleSyntax`.
module max_dependencies {
  type Slice = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | TypeOnly | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Package | PackageSub | Scoped | ScopedSub | SamePkgSub | Relative | Parent
    | Absolute | Hash | Builtin | BuiltinSub | BuiltinUncommon | Prefixed
  type Max = Ten | Two
  // ignoreFiles: [] / ['*.test.ts'] on src/app.test.ts / ['*.test.ts'] on src/app.ts.
  type IgnoreFiles = NoIgnore | Matching | NonMatching

  pure def newPackage(s: Spec): bool = Set(Package, PackageSub, Scoped, ScopedSub).contains(s)

  pure def reports(f: Form, s: Spec, ignoreType: bool, ignoreProbe: bool, files: IgnoreFiles): bool =
    files != Matching and newPackage(s) and not(ignoreProbe) and not(f == TypeOnly and ignoreType)

  var focus: Slice
  var form: Form
  var spec: Spec
  var max: Max
  var ignoreType: bool
  var ignoreProbe: bool
  var ignoreFiles: IgnoreFiles
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Package, PackageSub, Scoped, ScopedSub, SamePkgSub, Relative, Parent,
      Absolute, Hash, Builtin, BuiltinSub, BuiltinUncommon, Prefixed).oneOf()
    all {
      focus' = Spellings, form' = f, spec' = s, max' = Ten, ignoreType' = true,
      ignoreProbe' = false, ignoreFiles' = NoIgnore,
      verdict' = reports(f, s, true, false, NoIgnore),
    }
  }

  action options = {
    nondet f = Set(Default, TypeOnly).oneOf()
    nondet m = Set(Ten, Two).oneOf()
    nondet it = Set(true, false).oneOf()
    nondet ip = Set(true, false).oneOf()
    nondet fi = Set(NoIgnore, Matching, NonMatching).oneOf()
    all {
      focus' = Options, form' = f, spec' = Package, max' = m, ignoreType' = it,
      ignoreProbe' = ip, ignoreFiles' = fi,
      verdict' = reports(f, Package, it, ip, fi),
    }
  }

  action step = any { spellings, options }
  action init = step
}
