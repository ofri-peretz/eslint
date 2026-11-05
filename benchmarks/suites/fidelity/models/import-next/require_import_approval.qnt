// Model of eslint-plugin-import-next/require-import-approval.
// The user keeps a package policy (`packages`: name or `scope/*` / `prefix*`
// pattern -> approved | pending | blocked). The rule reports every way a
// third-party package is loaded or re-exported whose package name is
// `blocked` or `pending`, or - under `defaultPolicy: 'deny'` - not listed at
// all. `ignorePatterns` exempts packages. Defaults (`packages: []`,
// `defaultPolicy: 'allow'`) report nothing.
//
// Not a package, so never a finding: a relative or absolute path, a Node.js
// builtin (`fs`, `node:fs`), a `#` subpath import (the package's own files),
// and a path alias that npm cannot publish under (`@/lib`, `~/lib`: a scope
// is never empty and `~` is not allowed in a package name).
//
// Left out (judgment): type-only imports of a listed package.
module require_import_approval {
  type Focus = Spellings | Options
  type Form = Default | Namespace | Named | Renamed | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Blocked | BlockedSub | Pending | PendingSub | Approved | Unlisted
    | Relative | Builtin | NodeBuiltin | Hash | AliasAt | Tilde
  // Policy: axios blocked, @acme/* pending, lodash approved.
  type Config = Defaults | Policy | Deny | DenyIgnore

  pure def isPackage(s: Spec): bool =
    not(Set(Relative, Builtin, NodeBuiltin, Hash, AliasAt, Tilde).contains(s))

  pure def reports(s: Spec, c: Config): bool =
    if (not(isPackage(s)) or c == Defaults) false
    else if (c == DenyIgnore and Set(Blocked, BlockedSub).contains(s)) false
    else if (Set(Blocked, BlockedSub, Pending, PendingSub).contains(s)) true
    else if (s == Approved) false
    else Set(Deny, DenyIgnore).contains(c)

  var focus: Focus
  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action spellings = {
    nondet f = Set(Default, Namespace, Named, Renamed, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    all { focus' = Spellings, form' = f, spec' = Blocked, config' = Policy, verdict' = reports(Blocked, Policy) }
  }

  action options = {
    nondet s = Set(Blocked, BlockedSub, Pending, PendingSub, Approved, Unlisted,
      Relative, Builtin, NodeBuiltin, Hash, AliasAt, Tilde).oneOf()
    nondet c = Set(Defaults, Policy, Deny, DenyIgnore).oneOf()
    all { focus' = Options, form' = Default, spec' = s, config' = c, verdict' = reports(s, c) }
  }

  action step = any { spellings, options }
  action init = step
}
