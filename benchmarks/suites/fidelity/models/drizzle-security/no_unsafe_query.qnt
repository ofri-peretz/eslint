// Model of eslint-plugin-drizzle-security/no-unsafe-query (CWE-89).
// Drizzle's raw-SQL escape hatches take SQL TEXT: `sql.raw()` (on Drizzle's
// own `sql`, under any import name, the quoted `sql['raw']` included) and a
// plain string handed to `db.execute()` / `db.run()` / `db.all()`. Text built
// by template interpolation, `+` concatenation or `+=` from a value the file
// cannot prove fixed is SQL injection; so is request data handed over as the
// whole text. A value position has a bind parameter, so any unproven value
// there is a finding, a plain parameter included; a fragment position
// (`ORDER BY ${x}`) is reported only once traced to the request. Safe: a
// literal, a constant, `Number(...)`, a lookup in a `const` map, and the `sql`
// tagged template, which parameterizes its holes (an identifier hole inside
// it is `no-raw-identifier-interpolation`'s finding, not this rule's). A file
// that never imports drizzle-orm is not judged.
module no_unsafe_query {
  type Client = Named | Renamed | Namespace | Require | NoImport
  type Sink = SqlRaw | SqlRawBracket | Execute | ExecuteBracket | Run | All | Tagged
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | PlusAssign | WholeReq | OrderByReq
    | Literal | ConstTemplate | NumberTemplate | AllowlistOrder | OrderByParam

  pure def unsafeText(s: Shape): bool = match s {
    | TemplateReq => true
    | TemplateParam => true
    | ConcatReq => true
    | PlusAssign => true
    | WholeReq => true
    | OrderByReq => true
    | Literal => false
    | ConstTemplate => false
    | NumberTemplate => false
    | AllowlistOrder => false
    | OrderByParam => false
  }

  // The tagged template is spelled only with interpolation shapes.
  pure def applies(k: Sink, s: Shape): bool =
    k != Tagged or s == TemplateReq or s == TemplateParam or s == OrderByReq

  pure def reports(c: Client, k: Sink, s: Shape): bool =
    c != NoImport and k != Tagged and unsafeText(s)

  var client: Client
  var sink: Sink
  var shape: Shape
  var verdict: bool

  action step = {
    nondet c = Set(Named, Renamed, Namespace, Require, NoImport).oneOf()
    nondet k = Set(SqlRaw, SqlRawBracket, Execute, ExecuteBracket, Run, All, Tagged).oneOf()
    nondet s = Set(
      TemplateReq, TemplateParam, ConcatReq, PlusAssign, WholeReq, OrderByReq,
      Literal, ConstTemplate, NumberTemplate, AllowlistOrder, OrderByParam,
    ).filter(x => applies(k, x)).oneOf()
    all { client' = c, sink' = k, shape' = s, verdict' = reports(c, k, s) }
  }

  action init = step
}
