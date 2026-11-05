// Model of eslint-plugin-import-next/no-nodejs-modules.
// Code meant for a browser or edge runtime must not load a Node.js builtin.
// The rule reports every way a module is loaded or re-exported whose
// specifier names a Node.js builtin (Node's own builtin module list, with or
// without the `node:` scheme, including builtin subpaths like `fs/promises`)
// or a module listed in `additionalBuiltins`. `allow` exempts a builtin by
// name, in either spelling (`fs` and `node:fs` are the same module).
//
// Not a finding:
//   - `import type { Stats } from 'node:fs'`: erased at compile time, it
//     loads nothing at runtime;
//   - a package or relative path that only looks like a builtin name
//     (`fs-extra`, `./fs`).
// Left out (judgment): `import { type Stats } from 'fs'` - whether the
// statement survives compilation depends on `verbatimModuleSyntax`.
module no_nodejs_modules {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  // Bare `fs`, `node:fs`, `fs/promises`, `node:fs/promises`, a builtin outside
  // the common few (`worker_threads`), a look-alike package (`fs-extra`), a
  // relative path (`./fs`), and `electron` (not a builtin).
  type Spec = Bare | Prefixed | Subpath | PrefixedSubpath | Uncommon | LookAlike | Relative | Electron
  // allow: [] / ['fs'] / ['node:fs']; additionalBuiltins: ['electron'].
  type Config = Defaults | AllowBare | AllowPrefixed | AdditionalElectron

  pure def isFs(s: Spec): bool = Set(Bare, Prefixed, Subpath, PrefixedSubpath).contains(s)

  pure def isBuiltin(s: Spec, c: Config): bool =
    isFs(s) or s == Uncommon or (s == Electron and c == AdditionalElectron)

  pure def allowed(s: Spec, c: Config): bool =
    isFs(s) and Set(AllowBare, AllowPrefixed).contains(c)

  pure def reports(f: Form, s: Spec, c: Config): bool =
    f != TypeOnly and isBuiltin(s, c) and not(allowed(s, c))

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Bare, Prefixed, Subpath, PrefixedSubpath, Uncommon, LookAlike, Relative, Electron).oneOf()
    nondet c = Set(Defaults, AllowBare, AllowPrefixed, AdditionalElectron).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
