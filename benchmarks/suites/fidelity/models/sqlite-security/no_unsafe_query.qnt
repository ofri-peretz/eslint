// Model of eslint-plugin-sqlite-security/no-unsafe-query (CWE-89).
// A value spliced into the SQL text handed to a SQLite statement method is
// SQL injection when this file cannot prove it fixed. Sinks: prepare / exec /
// run / all / get (better-sqlite3, node:sqlite, sqlite3 and the `sqlite`
// promise wrapper), sqlite3's each, bun:sqlite's query, @libsql/client's
// execute (a string or `{ sql, args }`), and better-sqlite3's pragma, whose
// text is a fragment. In a value position (after `=`, inside quotes) any
// unproven value is a finding, a request value or a plain parameter alike;
// in a fragment position (ORDER BY target, PRAGMA argument) only request
// data is. Request data as the whole SQL text is a finding. Spliced in with
// a template, `+`, `+=`, or through a local const. Safe: `?` / `:name` bound
// parameters, a bound value handed to a prepared statement's get / run (even
// a template: it is a value, not SQL), a constant, a number (`Number(...)`),
// a `?` list built from an array, an allowlist map lookup, a value checked
// against an anchored regex first, a plain parameter as a fragment, a
// literal. A regex's `.exec()` is not a sink. The bracket spelling of the
// sink (`db['prepare']`) is judged; a file with no SQLite import and a test
// file are not.
module no_unsafe_query {
  type Part = Shapes | Drivers
  type Driver =
    | BetterSqlite | BetterRequire | Sqlite3 | NodeSqlite | BunSqlite
    | SqliteWrapper | Libsql | AnyTyped | Bracket | NoImport | TestFile
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | IndirectConcat | PlusAssign
    | StringCast | FragmentReq | WholeReq | PragmaReq | LibsqlSqlTemplate
    | Placeholder | NamedParam | StatementBound | ConstTemplate
    | NumberTemplate | PlaceholderList | AllowlistMap | RegexChecked
    | FragmentParam | PragmaParam | LibsqlArgs | RegexExec | Literal

  pure def unsafe(s: Shape): bool = match s {
    | TemplateReq => true
    | TemplateParam => true
    | ConcatReq => true
    | IndirectConcat => true
    | PlusAssign => true
    | StringCast => true
    | FragmentReq => true
    | WholeReq => true
    | PragmaReq => true
    | LibsqlSqlTemplate => true
    | _ => false
  }
  pure def judged(d: Driver): bool = d != NoImport and d != TestFile

  // pragma is better-sqlite3's; `{ sql, args }` is libsql's.
  pure def applies(d: Driver, s: Shape): bool =
    if (s == PragmaReq or s == PragmaParam) d == BetterSqlite
    else if (s == LibsqlSqlTemplate or s == LibsqlArgs) d == Libsql
    else true

  pure def reports(d: Driver, s: Shape): bool = judged(d) and unsafe(s)

  var part: Part
  var driver: Driver
  var shape: Shape
  var verdict: bool

  action step = {
    nondet pt = Set(Shapes, Drivers).oneOf()
    nondet d = (if (pt == Drivers) Set(
      BetterSqlite, BetterRequire, Sqlite3, NodeSqlite, BunSqlite,
      SqliteWrapper, Libsql, AnyTyped, Bracket, NoImport, TestFile,
    ) else Set(BetterSqlite, Libsql)).oneOf()
    nondet s = (if (pt == Shapes) Set(
      TemplateReq, TemplateParam, ConcatReq, IndirectConcat, PlusAssign,
      StringCast, FragmentReq, WholeReq, PragmaReq, LibsqlSqlTemplate,
      Placeholder, NamedParam, StatementBound, ConstTemplate, NumberTemplate,
      PlaceholderList, AllowlistMap, RegexChecked, FragmentParam, PragmaParam,
      LibsqlArgs, RegexExec, Literal,
    ).filter(x => applies(d, x)) else Set(TemplateReq, ConcatReq, Placeholder, Literal)).oneOf()
    all { part' = pt, driver' = d, shape' = s, verdict' = reports(d, s) }
  }

  action init = step
}
