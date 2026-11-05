// Model of eslint-plugin-import-next/no-unused-modules.
// A documented convention: every module exports something. The rule reports a
// module with no export at all. An export is any way the module hands a value
// out: ESM `export` (named, default, `export * from`, a type), TS
// `export =`, and CommonJS writes to the real `module.exports` / `exports`:
// `module.exports = `, `module['exports'] = `, `exports.a = `,
// `module.exports.a = `, `Object.defineProperty(exports, ...)`.
// A write to a LOCAL named `exports` (a parameter) exports nothing.
// `export {}` exports nothing, but is how TS marks a file a module on
// purpose: judgment, so silent.
// `allowImportOnly` (default false) exempts a module that imports (ESM
// `import`, `require()`, TS `import x = require()`) and exports nothing.
module no_unused_modules {
  type Exp = NoExport | EsmNamed | EsmDefault | ExportAll | ExportEquals | ModuleExports
           | ModuleExportsBracket | ExportsProp | ModuleExportsProp | DefineProperty
           | ShadowedExports | EmptyExport | TypeExport
  type Imp = NoImport | EsmImport | RequireCall | ImportEquals

  pure def exports(e: Exp): bool = not(Set(NoExport, ShadowedExports).contains(e))
  pure def reports(e: Exp, i: Imp, allow: bool): bool =
    not(exports(e)) and not(allow and i != NoImport)

  var exp: Exp
  var imp: Imp
  var allowImportOnly: bool
  var verdict: bool

  action step = {
    nondet e = Set(NoExport, EsmNamed, EsmDefault, ExportAll, ExportEquals, ModuleExports,
                   ModuleExportsBracket, ExportsProp, ModuleExportsProp, DefineProperty,
                   ShadowedExports, EmptyExport, TypeExport).oneOf()
    nondet i = Set(NoImport, EsmImport, RequireCall, ImportEquals).oneOf()
    nondet a = Set(true, false).oneOf()
    all { exp' = e, imp' = i, allowImportOnly' = a, verdict' = reports(e, i, a) }
  }

  action init = step
}
