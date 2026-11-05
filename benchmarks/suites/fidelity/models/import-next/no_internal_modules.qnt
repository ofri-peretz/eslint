// Model of eslint-plugin-import-next/no-internal-modules.
// Code should import a module through its entry point, not reach into its
// files. The depth of a specifier is how many path segments it goes past the
// module root: a package (`lodash` 0, `lodash/get` 1, `lodash/fp/get` 2), a
// scoped package (`@o/ui` 0, `@o/ui/button` 1), a relative path (each
// segment after the `./` / `../` prefix: `./utils` 1, `./utils/helpers` 2,
// `../../a/b` 2). A trailing slash names the same module (`./utils/` is
// `./utils`, `lodash/` is `lodash`). The rule reports every way a module is
// loaded or re-exported whose depth exceeds `maxDepth` (default 1) or that
// matches a `forbid` glob, unless it matches an `allow` or `ignorePaths`
// glob. `strategy` only changes how a finding is fixed, never whether it is
// reported.
//
// Left out (judgment): `./utils/index` - it is `./utils` only when `utils` is
// a directory, not when `utils.ts` sits beside it; builtin subpaths
// (`node:fs/promises`) under `maxDepth: 0`.
module no_internal_modules {
  type Focus = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Pkg | PkgSub | PkgDeep | PkgTrailing | Scoped | ScopedSub | ScopedDeep
    | Rel | RelDeep | RelParentDeep | RelTrailing
  // maxDepth 1 (default) / 0 / 2; allow ['lodash/**']; forbid ['lodash/get'];
  // ignorePaths ['./utils/**']; strategy 'suggest'.
  type Config = Defaults | Max0 | Max2 | Allow | Forbid | Ignore | Suggest

  pure def depth(s: Spec): int =
    if (Set(Pkg, PkgTrailing, Scoped).contains(s)) 0
    else if (Set(PkgSub, ScopedSub, Rel, RelTrailing).contains(s)) 1
    else 2

  pure def maxDepth(c: Config): int =
    if (c == Max0) 0 else if (c == Max2) 2 else 1

  pure def reports(s: Spec, c: Config): bool =
    val ignored = c == Ignore and Set(RelDeep, RelTrailing).contains(s)
    val allowed = c == Allow and Set(PkgSub, PkgDeep, PkgTrailing).contains(s)
    val forbidden = c == Forbid and s == PkgSub
    not(ignored) and not(allowed) and (depth(s) > maxDepth(c) or forbidden)

  var focus: Focus
  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Rel, RelDeep).oneOf()
    all { focus' = Spellings, form' = f, spec' = s, config' = Defaults, verdict' = reports(s, Defaults) }
  }

  action options = {
    nondet s = Set(Pkg, PkgSub, PkgDeep, PkgTrailing, Scoped, ScopedSub, ScopedDeep,
      Rel, RelDeep, RelParentDeep, RelTrailing).oneOf()
    nondet c = Set(Defaults, Max0, Max2, Allow, Forbid, Ignore, Suggest).oneOf()
    all { focus' = Options, form' = Default, spec' = s, config' = c, verdict' = reports(s, c) }
  }

  action step = any { spellings, options }
  action init = step
}
