// Model of eslint-plugin-import-next/no-relative-parent-imports.
// A module may only depend on files at or below its own directory. The rule
// reports every way a module is loaded or re-exported whose specifier, once
// normalised, climbs out of the importing file's directory: `..`, `../x`,
// `./../x`, `./a/../../x`. `commonjs` (default true) covers `require()`; `amd`
// (default false) covers `define([...])` / `require([...])` dependency arrays.
// `import x = require()` is TypeScript's ES-import form and always counts.
//
// Not a finding: a path that stays inside (`./x`, `./a/../b`), or a package.
module no_relative_parent_imports {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
    | AmdDefine | AmdRequire
  type Spec = Parent | ParentBare | DotParent | Embedded | InsideViaDots | Sibling | Package
  // commonjs: true, amd: false (defaults) / commonjs: false / amd: true.
  type Config = Defaults | NoCommonjs | Amd

  pure def climbs(s: Spec): bool = Set(Parent, ParentBare, DotParent, Embedded).contains(s)

  pure def checked(f: Form, c: Config): bool =
    if (f == Require) c != NoCommonjs
    else if (Set(AmdDefine, AmdRequire).contains(f)) c == Amd
    else true

  pure def reports(f: Form, s: Spec, c: Config): bool = climbs(s) and checked(f, c)

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals,
      AmdDefine, AmdRequire).oneOf()
    nondet s = Set(Parent, ParentBare, DotParent, Embedded, InsideViaDots, Sibling, Package).oneOf()
    nondet c = Set(Defaults, NoCommonjs, Amd).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
