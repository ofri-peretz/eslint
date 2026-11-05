// Model of eslint-plugin-import-next/no-unassigned-import.
// An import that binds nothing is loaded only for its side effects, which
// the reader cannot see. The rule reports a module load that binds no name:
// `import 'm'`, `import {} from 'm'`, and a `require('m')` whose result is
// discarded (an expression statement). `allowModules` exempts specifiers by
// exact match.
//
// Not a finding: every form that binds or re-exports something (default,
// namespace, named, type-only, `export ... from`, a `require` whose result is
// assigned, `import x = require()`, a dynamic `import()` whose promise is
// used).
// Left out (judgment): a bare `import('m');` statement - a lazy side-effect
// load that upstream never covered.
module no_unassigned_import {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
    | EmptyBraces | RequireStatement
  // allowModules: [] / ['./polyfill'] (this module) / ['./other'].
  type Config = Defaults | AllowThis | AllowOther

  pure def reports(f: Form, c: Config): bool =
    Set(SideEffect, EmptyBraces, RequireStatement).contains(f) and c != AllowThis

  var form: Form
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals,
      EmptyBraces, RequireStatement).oneOf()
    nondet c = Set(Defaults, AllowThis, AllowOther).oneOf()
    all { form' = f, config' = c, verdict' = reports(f, c) }
  }

  action init = step
}
