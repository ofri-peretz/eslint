// Model of eslint-plugin-import-next/no-absolute-path.
// A module specifier that is an absolute file-system path ties the code to
// one machine. Each option turns on one module system: `esmodule` (default
// on) covers every ES spelling - `import`, side-effect `import`, `export ...
// from`, `export * from`, `import()`; `commonjs` (default on) covers
// `require()` and TS `import x = require()`; `amd` (default off) covers the
// dependency array of `define([...], f)` / `require([...], f)`. A static
// template literal is the same string as a quoted one. Relative and package
// specifiers are silent.
module no_absolute_path {
  type Form = Import | SideEffect | ExportNamed | ExportAll | Dynamic | DynamicTemplate
    | Require | RequireTemplate | ImportEquals | AmdDefine | AmdRequire
  type Spec = Absolute | Relative | Package
  type Opts = Defaults | NoEsm | NoCjs | WithAmd

  pure def esm(f: Form): bool = Set(Import, SideEffect, ExportNamed, ExportAll, Dynamic, DynamicTemplate).contains(f)
  pure def cjs(f: Form): bool = Set(Require, RequireTemplate, ImportEquals).contains(f)

  pure def checked(f: Form, o: Opts): bool =
    if (esm(f)) o != NoEsm
    else if (cjs(f)) o != NoCjs
    else o == WithAmd

  var form: Form
  var spec: Spec
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Import, SideEffect, ExportNamed, ExportAll, Dynamic, DynamicTemplate,
      Require, RequireTemplate, ImportEquals, AmdDefine, AmdRequire).oneOf()
    nondet s = Set(Absolute, Relative, Package).oneOf()
    nondet o = Set(Defaults, NoEsm, NoCjs, WithAmd).oneOf()
    all { form' = f, spec' = s, opts' = o, verdict' = (s == Absolute and checked(f, o)) }
  }

  action init = step
}
