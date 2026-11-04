// Model of eslint-plugin-postgresql-security/no-select-all.
// `SELECT *` sent through pg `query()` fetches every column, breaks when the
// schema changes and can leak columns added later. Reported in any case, in a
// template with no interpolation, mixed into a column list, as a table-wide
// `alias.*`, and as the `text` of a `{ text, values }` QueryConfig. Safe: an
// explicit column list, `COUNT(*)`, a multiplication (`price * qty`), and `*`
// over a CTE or derived table whose own SELECT names the columns. Files with no
// PostgreSQL import are not judged.
module no_select_all {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | SinkBracket | NoImport
  type Sql =
    | Star | Lowercase | TemplateStar | Mixed | AliasStar | ConfigStar
    | Columns | CountStar | Multiply | CteStar | DerivedStar

  pure def selectsAll(q: Sql): bool = match q {
    | Star => true
    | Lowercase => true
    | TemplateStar => true
    | Mixed => true
    | AliasStar => true
    | ConfigStar => true
    | Columns => false
    | CountStar => false
    | Multiply => false
    | CteStar => false
    | DerivedStar => false
  }

  pure def reports(d: Driver, q: Sql): bool = d != NoImport and selectsAll(q)

  var driver: Driver
  var sql: Sql
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      SinkBracket, NoImport,
    ).oneOf()
    nondet q = Set(
      Star, Lowercase, TemplateStar, Mixed, AliasStar, ConfigStar,
      Columns, CountStar, Multiply, CteStar, DerivedStar,
    ).oneOf()
    all { driver' = d, sql' = q, verdict' = reports(d, q) }
  }

  action init = step
}
