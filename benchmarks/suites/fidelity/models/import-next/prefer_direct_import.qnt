// Model of eslint-plugin-import-next/prefer-direct-import: a configured
// convention. A `mappings` entry names a barrel specifier (`barrel`, a
// regular expression) and the direct path for each export (`directPath`,
// with `{name}`). Importing a NAMED runtime binding from a mapped barrel is
// reported: `import { Button }`, `import { Button as B }`, several names (one
// report each), and the value specifiers of an import mixing inline `type`
// ones, and `export { Button } from` the barrel. `autoFix` (default true)
// only chooses fix vs suggestion.
//
// Not reported: a specifier no mapping names, a path already direct, a
// default / namespace / side-effect import or `export *` (no export name to
// map), type-only imports (`import type`, all-inline `type`: erased), and
// `require()` / `import()` (judgment: silent).
//
// Left out: candidate for change (fires on a guess). Without `mappings` the
// rule applies built-in mappings for the literal specifiers `@/components`,
// `@/hooks`, `@/utils`, `@/lib`, `~/components`, `~/hooks`, and fixes to
// `<specifier>/<name>` without checking that module exists.
module prefer_direct_import {
  type Form = Named | Renamed | MultiNamed | Default | Namespace | TypeOnly | InlineType
            | MixedInline | SideEffect | ExportNamed | ExportAll | Require | Dynamic
  type Target = Mapped | Unmapped | Direct
  type Opts = Configured | ConfiguredNoFix

  pure def reports(f: Form, t: Target, o: Opts): bool =
    t == Mapped and Set(Named, Renamed, MultiNamed, MixedInline, ExportNamed).contains(f)

  var form: Form
  var target: Target
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Named, Renamed, MultiNamed, Default, Namespace, TypeOnly, InlineType,
                   MixedInline, SideEffect, ExportNamed, ExportAll, Require, Dynamic).oneOf()
    nondet t = Set(Mapped, Unmapped, Direct).oneOf()
    nondet o = Set(Configured, ConfiguredNoFix).oneOf()
    all { form' = f, target' = t, opts' = o, verdict' = reports(f, t, o) }
  }

  action init = step
}
