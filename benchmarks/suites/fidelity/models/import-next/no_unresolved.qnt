// Model of eslint-plugin-import-next/no-unresolved.
// Reports a static module specifier that resolves to no file, the way Node /
// TypeScript resolve it: relative paths (with or without an extension, an
// index file, the NodeNext `.js` -> `.ts` spelling), node_modules packages
// (scoped too), a package `exports` map (a subpath it does not export does
// not resolve), the package.json `imports` map (`#util`) and tsconfig
// `paths` aliases (`@/dep`).
//
// Not reported:
//   - Node builtins, bare or `node:`;
//   - a specifier the resolver cannot judge: a bundler query suffix on a file
//     that exists (`./style.css?inline`) and a URL scheme (`virtual:routes`);
//     an unknown is not a finding;
//   - a specifier `ignore` names (exact, or as a path prefix);
//   - anything when `allowUnresolved` is true.
//
// Every spelling: import, import type, side-effect, export-from, export *,
// import(), require(), import = require().
module no_unresolved {
  type Form = Import | TypeOnly | SideEffect | ExportNamed | ExportAll | Dynamic | Require | ImportEquals
  type Spec = RelExt | RelNoExt | RelJsMapped | RelDir | RelMissing | RelMissingJs
            | Pkg | PkgMissing | PkgExported | PkgNotExported | Scoped
            | Builtin | NodeBuiltin | HashImport | Alias | AliasMissing | QuerySuffix | Protocol
  type Opts = Default | IgnoreSome | AllowAll

  pure def unresolved(p: Spec): bool =
    Set(RelMissing, RelMissingJs, PkgMissing, PkgNotExported, AliasMissing).contains(p)

  pure def ignored(p: Spec, o: Opts): bool =
    o == IgnoreSome and Set(PkgMissing, RelMissing).contains(p)

  pure def reports(p: Spec, o: Opts): bool =
    o != AllowAll and unresolved(p) and not(ignored(p, o))

  var form: Form
  var spec: Spec
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Import, TypeOnly, SideEffect, ExportNamed, ExportAll, Dynamic, Require, ImportEquals).oneOf()
    nondet p = Set(RelExt, RelNoExt, RelJsMapped, RelDir, RelMissing, RelMissingJs,
                   Pkg, PkgMissing, PkgExported, PkgNotExported, Scoped,
                   Builtin, NodeBuiltin, HashImport, Alias, AliasMissing, QuerySuffix, Protocol).oneOf()
    nondet o = Set(Default, IgnoreSome, AllowAll).oneOf()
    all { form' = f, spec' = p, opts' = o, verdict' = reports(p, o) }
  }

  action init = step
}
