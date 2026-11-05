// Model of eslint-plugin-import-next/no-barrel-import: a configured
// convention. A module is a barrel when `knownBarrels` (regular expressions
// over the specifier) names it; importing it loads every module it
// re-exports. Reported: a runtime load of a known barrel by any spelling
// (import, side-effect import, `export ... from`, `export *`, `require()`,
// `import()`, TS `import x = require()`). Not reported:
//   - type-only imports and re-exports (`import type`, all-inline `type`
//     specifiers, `export type ... from`): erased, they load nothing;
//   - a package named in `ignoredPackages`, whatever `ignoreNodeModules`;
//   - a module `knownBarrels` does not name. `ignoreNodeModules` (default
//     true) does not hide a package the user listed in `knownBarrels`.
//
// Left out: candidate for change (fires on a guess). A specifier spelled
// with `/index` (`./components/index`) is reported whatever the file holds:
// an index file is not necessarily a barrel, and the rule does not look.
module no_barrel_import {
  type Form = Default | Named | Namespace | SideEffect | TypeOnly | InlineType | ExportType
            | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Target = Known | Other | Pkg | PkgSub
  type Opts = Unconfigured | Known_ | KnownNoNM | KnownIgnored | KnownIgnoredNoNM

  pure def runtime(f: Form): bool = not(Set(TypeOnly, InlineType, ExportType).contains(f))

  pure def reports(f: Form, t: Target, o: Opts): bool =
    runtime(f) and o != Unconfigured
      and (t == Known or (t == Pkg and not(Set(KnownIgnored, KnownIgnoredNoNM).contains(o))))

  var form: Form
  var target: Target
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Default, Named, Namespace, SideEffect, TypeOnly, InlineType, ExportType,
                   ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet t = Set(Known, Other, Pkg, PkgSub).oneOf()
    nondet o = Set(Unconfigured, Known_, KnownNoNM, KnownIgnored, KnownIgnoredNoNM).oneOf()
    all { form' = f, target' = t, opts' = o, verdict' = reports(f, t, o) }
  }

  action init = step
}
