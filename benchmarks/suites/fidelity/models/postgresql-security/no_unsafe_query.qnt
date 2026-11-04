// Model of eslint-plugin-postgresql-security/no-unsafe-query (CWE-89).
// A value spliced into SQL text (a template interpolation or a `+`
// concatenation) that the file cannot prove safe is SQL injection, whether it
// comes from the request or from a plain parameter. The sinks are pg
// `query()`, pg-promise's result methods (`any`, `none`, ...) and postgres.js
// `sql.unsafe()`. Safe: bind parameters (`$1` + a values array, or a
// `{ text, values }` QueryConfig), a postgres.js tagged `sql` template, a
// constant, a number (`Number(...)`), an allowlist lookup in a `const` object
// literal, anything from pg-format, a bind index `$${params.length}` over an
// array the file builds, and text that is not a SQL statement at all.
// `String(x)` is not an escaper, and `$${req.body.x.length}` is request data.
// A query assembled in a variable first (`const q = ... + x`, `q ??= ...`)
// is followed to the sink. Files with no PostgreSQL import are not judged.
module no_unsafe_query {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | SinkBracket | PgPromise | PostgresJs | NoImport
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | IndirectConcat | NullishAssign
    | StringCast | BindIndexBody | QueryConfigTemplate
    | Parameterized | QueryConfig | ConstTemplate | NumberTemplate
    | AllowlistTemplate | FormatLiteral | BindIndex | NotSql | Literal | Tagged

  pure def unsafe(s: Shape): bool = match s {
    | TemplateReq => true
    | TemplateParam => true
    | ConcatReq => true
    | IndirectConcat => true
    | NullishAssign => true
    | StringCast => true
    | BindIndexBody => true
    | QueryConfigTemplate => true
    | Parameterized => false
    | QueryConfig => false
    | ConstTemplate => false
    | NumberTemplate => false
    | AllowlistTemplate => false
    | FormatLiteral => false
    | BindIndex => false
    | NotSql => false
    | Literal => false
    | Tagged => false
  }

  pure def isPg(d: Driver): bool = d != PgPromise and d != PostgresJs

  // QueryConfig objects are pg's API; the tagged template is postgres.js's.
  pure def applies(d: Driver, s: Shape): bool =
    if (s == QueryConfig or s == QueryConfigTemplate) isPg(d)
    else if (s == Tagged) d == PostgresJs
    else true

  pure def reports(d: Driver, s: Shape): bool = d != NoImport and unsafe(s)

  var driver: Driver
  var shape: Shape
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      SinkBracket, PgPromise, PostgresJs, NoImport,
    ).oneOf()
    nondet s = Set(
      TemplateReq, TemplateParam, ConcatReq, IndirectConcat, NullishAssign,
      StringCast, BindIndexBody, QueryConfigTemplate,
      Parameterized, QueryConfig, ConstTemplate, NumberTemplate,
      AllowlistTemplate, FormatLiteral, BindIndex, NotSql, Literal, Tagged,
    ).filter(x => applies(d, x)).oneOf()
    all { driver' = d, shape' = s, verdict' = reports(d, s) }
  }

  action init = step
}
