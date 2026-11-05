// Model of eslint-plugin-import-next/no-commonjs.
// CommonJS in an ES module: a call to the GLOBAL `require` (static or
// dynamic argument), TS `import x = require()`, assigning `module.exports`
// (dotted, computed, or one of its properties), assigning a property of the
// global `exports`, and reading the global `__dirname` / `__filename`. The
// rule decides by binding: a locally bound `require` (a parameter, or
// `createRequire(import.meta.url)`, the sanctioned ESM way to load CJS), a
// local `exports` object, a local `__dirname` (the standard ESM shim) and a
// property named `__dirname` are not CommonJS globals. A `.cjs` file is
// CommonJS by its extension: nothing in it is a finding. Options:
// allowRequire (require and import-equals), allowModuleExports, allowExports,
// allowInFiles (file globs; covers everything).
// left out (judgment): `require.resolve()` (reads the CJS resolver, loads
// nothing).
module no_commonjs {
  type Construct = Require | RequireDynamic | RequireCreated | RequireParam | ImportEquals
    | ModuleExports | ModuleExportsComputed | ModuleExportsProp | ExportsProp | ExportsComputed | ExportsLocal
    | Dirname | DirnameShim | DirnameMember | EsmImport
  type Opts = Defaults | AllowRequire | AllowModuleExports | AllowExports | AllowInFilesMatch | AllowInFilesOther
  type File = Ts | Cjs

  pure def reports(c: Construct, o: Opts, f: File): bool =
    if (f == Cjs or o == AllowInFilesMatch) false
    else if (Set(Require, RequireDynamic, ImportEquals).contains(c)) o != AllowRequire
    else if (Set(ModuleExports, ModuleExportsComputed, ModuleExportsProp).contains(c)) o != AllowModuleExports
    else if (Set(ExportsProp, ExportsComputed).contains(c)) o != AllowExports
    else c == Dirname

  var construct: Construct
  var opts: Opts
  var file: File
  var verdict: bool

  action step = {
    nondet c = Set(Require, RequireDynamic, RequireCreated, RequireParam, ImportEquals,
      ModuleExports, ModuleExportsComputed, ModuleExportsProp, ExportsProp, ExportsComputed, ExportsLocal,
      Dirname, DirnameShim, DirnameMember, EsmImport).oneOf()
    nondet o = Set(Defaults, AllowRequire, AllowModuleExports, AllowExports, AllowInFilesMatch, AllowInFilesOther).oneOf()
    nondet f = Set(Ts, Cjs).oneOf()
    all { construct' = c, opts' = o, file' = f, verdict' = reports(c, o, f) }
  }

  action init = step
}
