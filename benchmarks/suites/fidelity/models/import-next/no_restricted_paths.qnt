// Model of eslint-plugin-import-next/no-restricted-paths.
// The user lists path patterns (`restricted`) that code must not import. A
// pattern is one or more path segments (`server`, `app/server`); the rule
// reports every way a module is loaded or re-exported whose specifier
// contains those segments, in order, as whole path segments. Default `[]`
// restricts nothing.
//
// Not a finding: a specifier that only contains the pattern as part of a
// segment name: `./observer` and `./server-utils` are not the `server` path.
module no_restricted_paths {
  type Form = Default | Namespace | Named | Renamed | TypeOnly | InlineType | SideEffect
    | ExportNamed | ExportAll | ExportAllAs | Require | Dynamic | ImportEquals
  type Spec = Exact | Relative | Nested | Alias | Substring | SegmentPrefix | Unrelated
  // restricted: [] / ['server'] / ['app/server'].
  type Config = Defaults | Server | AppServer

  pure def matches(s: Spec, c: Config): bool =
    if (c == Server) Set(Exact, Relative, Nested, Alias).contains(s)
    else if (c == AppServer) s == Nested
    else false

  pure def reports(f: Form, s: Spec, c: Config): bool = matches(s, c)

  var form: Form
  var spec: Spec
  var config: Config
  var verdict: bool

  action step = {
    nondet f = Set(Default, Namespace, Named, Renamed, TypeOnly, InlineType, SideEffect,
      ExportNamed, ExportAll, ExportAllAs, Require, Dynamic, ImportEquals).oneOf()
    nondet s = Set(Exact, Relative, Nested, Alias, Substring, SegmentPrefix, Unrelated).oneOf()
    nondet c = Set(Defaults, Server, AppServer).oneOf()
    all { form' = f, spec' = s, config' = c, verdict' = reports(f, s, c) }
  }

  action init = step
}
