// Model of eslint-plugin-drizzle-security/no-raw-identifier-interpolation (CWE-89).
// Drizzle's `sql` tagged template binds every hole as a VALUE. A hole where
// an identifier belongs (a table after FROM, an ORDER BY column, a sort
// direction, a pre-quoted "${table}") cannot be bound, so the string is
// spliced verbatim: reported, as is `${sql.raw(table)}` (raw splices) and a
// query RESULT used as a table. Silent: value positions (`= ${x}`,
// `LIMIT ${n}`), a literal, a module constant, a ternary between literals,
// and what Drizzle renders itself: `sql.identifier()` (the recommended fix,
// over a raw value or an allowlisted one), `sql.join()`, `sql.placeholder()`,
// a nested `sql` fragment, a table or column built with the schema helpers,
// and a named subquery (`.as()`). The tag is matched through its import,
// renamed, namespaced or required; a file that never imports drizzle-orm is
// not judged.
module no_raw_identifier_interpolation {
  type Client = Named | Renamed | Namespace | Require | NoImport
  type Hole =
    | TableParam | OrderByReq | DirParam | QuotedTable | RawParam | ResultTable
    | ValueReq | LimitParam | LiteralHole | ConstTable | DirTernary
    | Identifier | AllowlistIdentifier | Join | Placeholder | Nested
    | SchemaTable | SchemaColumn | Subquery

  pure def identifierHole(h: Hole): bool = match h {
    | TableParam => true
    | OrderByReq => true
    | DirParam => true
    | QuotedTable => true
    | RawParam => true
    | ResultTable => true
    | ValueReq => false
    | LimitParam => false
    | LiteralHole => false
    | ConstTable => false
    | DirTernary => false
    | Identifier => false
    | AllowlistIdentifier => false
    | Join => false
    | Placeholder => false
    | Nested => false
    | SchemaTable => false
    | SchemaColumn => false
    | Subquery => false
  }

  pure def reports(c: Client, h: Hole): bool = c != NoImport and identifierHole(h)

  var client: Client
  var hole: Hole
  var verdict: bool

  action step = {
    nondet c = Set(Named, Renamed, Namespace, Require, NoImport).oneOf()
    nondet h = Set(
      TableParam, OrderByReq, DirParam, QuotedTable, RawParam, ResultTable,
      ValueReq, LimitParam, LiteralHole, ConstTable, DirTernary,
      Identifier, AllowlistIdentifier, Join, Placeholder, Nested,
      SchemaTable, SchemaColumn, Subquery,
    ).oneOf()
    all { client' = c, hole' = h, verdict' = reports(c, h) }
  }

  action init = step
}
