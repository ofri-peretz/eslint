// Model of eslint-plugin-import-next/no-unresolved.
// Reports a static module specifier that resolves to no file, the way Node /
// TypeScript resolve it: relative paths (with or without an extension, an
// index file, the NodeNext `.js` -> `.ts` spelling), node_modules packages
// (scoped too), a package `exports` map (a subpath it does not export does
// not resolve), the package.json `imports` map (`#util`) and tsconfig
// `paths` aliases (`@/dep`).
//
// A value import of a `@types/*` package is reported too: it holds
// declarations only, which Node cannot load and TypeScript refuses to import
// by that name (TS6137). That applies to value forms only.
//
// A type-only declaration (`import type`, `export type ... from`) is never
// reported, whatever the specifier: it is erased, so a module that exists only
// at type-check time is not a runtime resolution failure. eslint-plugin-import
// v2.32.0 returns before resolving (`src/rules/no-unresolved.js:33`); its tests
// (`tests/src/rules/no-unresolved.js:519-534`) pin it. `import { type X }` is a
// value declaration and is still checked.
//
// Not reported:
//   - Node builtins, bare or `node:`;
//   - a specifier the resolver cannot judge: a bundler query suffix on a file
//     that exists (`./style.css?inline`) and a URL scheme (`virtual:routes`);
//     an unknown is not a finding;
//   - a specifier `ignore` names (exact, or as a path prefix);
//   - anything when `allowUnresolved` is true.
//
// Every runtime spelling: import, side-effect, export-from, export *,
// import(), require(), import = require().
module no_unresolved {
  type Form = Import | TypeOnly | SideEffect | ExportNamed | ExportAll | Dynamic | Require | ImportEquals
  type Spec = RelExt | RelNoExt | RelJsMapped | RelDir | RelMissing | RelMissingJs
            | Pkg | PkgMissing | PkgExported | PkgNotExported | Scoped
            | Builtin | NodeBuiltin | HashImport | Alias | AliasMissing | QuerySuffix | Protocol
            | TypesPkg
  type Opts = Default | IgnoreSome | AllowAll

  pure def unresolved(f: Form, p: Spec): bool =
    f != TypeOnly and (
      Set(RelMissing, RelMissingJs, PkgMissing, PkgNotExported, AliasMissing).contains(p)
        or p == TypesPkg
    )

  pure def ignored(p: Spec, o: Opts): bool =
    o == IgnoreSome and Set(PkgMissing, RelMissing).contains(p)

  pure def reports(f: Form, p: Spec, o: Opts): bool =
    o != AllowAll and unresolved(f, p) and not(ignored(p, o))

  var form: Form
  var spec: Spec
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Import, TypeOnly, SideEffect, ExportNamed, ExportAll, Dynamic, Require, ImportEquals).oneOf()
    nondet p = Set(RelExt, RelNoExt, RelJsMapped, RelDir, RelMissing, RelMissingJs,
                   Pkg, PkgMissing, PkgExported, PkgNotExported, Scoped,
                   Builtin, NodeBuiltin, HashImport, Alias, AliasMissing, QuerySuffix, Protocol,
                   TypesPkg).oneOf()
    nondet o = Set(Default, IgnoreSome, AllowAll).oneOf()
    all { form' = f, spec' = p, opts' = o, verdict' = reports(f, p, o) }
  }

  action init = step
}
