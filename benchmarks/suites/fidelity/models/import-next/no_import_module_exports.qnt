// Model of eslint-plugin-import-next/no-import-module-exports.
// A file that runs `import` declarations AND exports through CommonJS mixes
// two module systems a bundler cannot reconcile. The finding needs both: a
// value `import ... from` (a type-only import is erased, so it mixes nothing;
// a dynamic `import()` is legal in CommonJS) and a use of the GLOBAL `module`
// / `exports` objects (assigning `module.exports`, dotted or computed, one of
// its properties, a property of `exports`, or reading `module.exports`). A
// `module` / `exports` bound in the file (a wrapper's parameters) is not the
// CommonJS global. `exceptions` lists file globs that are exempt.
// left out (judgment): the package `main` entry exemption upstream applies.
module no_import_module_exports {
  type Imp = NoImport | ValueImport | TypeImport | DynamicImport
  type Use = ModuleExportsAssign | ModuleExportsComputed | ModuleExportsProp | ExportsProp
    | ModuleExportsRead | LocalParams | EsmExport
  type Exc = NoExceptions | ExceptionMatch | ExceptionOther

  pure def cjs(u: Use): bool = not(Set(LocalParams, EsmExport).contains(u))

  var imp: Imp
  var use: Use
  var exc: Exc
  var verdict: bool

  action step = {
    nondet i = Set(NoImport, ValueImport, TypeImport, DynamicImport).oneOf()
    nondet u = Set(ModuleExportsAssign, ModuleExportsComputed, ModuleExportsProp, ExportsProp,
      ModuleExportsRead, LocalParams, EsmExport).oneOf()
    nondet e = Set(NoExceptions, ExceptionMatch, ExceptionOther).oneOf()
    all { imp' = i, use' = u, exc' = e,
          verdict' = (i == ValueImport and cjs(u) and e != ExceptionMatch) }
  }

  action init = step
}
