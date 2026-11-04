// Model of eslint-plugin-postgresql-security/no-unsafe-search-path (CWE-426).
// Whoever picks the `search_path` picks which schema's tables and functions
// unqualified names resolve to. A caller-chosen schema is reported however it
// reaches the server: interpolated or concatenated into `SET [LOCAL]
// search_path`, quoted with pg-format `%I` or `escapeIdentifier` (quoting
// stops injection, not the selection), bound into
// `set_config('search_path', $1, ...)`, or set at connect time through a
// Pool/Client `options: '-c search_path=...'`. Safe: a constant schema, a
// literal `SET`, a constant bound value, and a caller value checked against an
// allowlist before the sink (an inline `if (...) throw`, or an `asserts`
// helper). Files with no PostgreSQL import are not judged.
module no_unsafe_search_path {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | SinkBracket | NoImport
  type Path =
    | TemplateReq | TemplateParam | Concat | SetLocal | FormatIdent
    | EscapedIdent | SetConfigBound | OptionsDynamic
    | Guarded | AssertsHelper | ConstSchema | Literal | SetConfigConst
    | OptionsConst

  pure def callerChosen(p: Path): bool = match p {
    | TemplateReq => true
    | TemplateParam => true
    | Concat => true
    | SetLocal => true
    | FormatIdent => true
    | EscapedIdent => true
    | SetConfigBound => true
    | OptionsDynamic => true
    | Guarded => false
    | AssertsHelper => false
    | ConstSchema => false
    | Literal => false
    | SetConfigConst => false
    | OptionsConst => false
  }

  // A query-call spelling means nothing for a connect-time option.
  pure def applies(d: Driver, p: Path): bool =
    not(d == SinkBracket and (p == OptionsDynamic or p == OptionsConst))

  pure def reports(d: Driver, p: Path): bool = d != NoImport and callerChosen(p)

  var driver: Driver
  var path: Path
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      SinkBracket, NoImport,
    ).oneOf()
    nondet p = Set(
      TemplateReq, TemplateParam, Concat, SetLocal, FormatIdent,
      EscapedIdent, SetConfigBound, OptionsDynamic,
      Guarded, AssertsHelper, ConstSchema, Literal, SetConfigConst,
      OptionsConst,
    ).filter(x => applies(d, x)).oneOf()
    all { driver' = d, path' = p, verdict' = reports(d, p) }
  }

  action init = step
}
