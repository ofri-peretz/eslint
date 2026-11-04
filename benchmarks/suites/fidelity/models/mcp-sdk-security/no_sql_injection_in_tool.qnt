// Model of eslint-plugin-mcp-sdk-security/no-sql-injection-in-tool (CWE-89).
// A tool argument (or request.params.arguments, or a ResourceTemplate
// variable) that is, builds or derives the SQL text of a driver call is
// reported. The driver is known from how the receiver was built: pg Pool /
// Client (and a client from pool.connect()), mysql2 createPool, better-sqlite3
// prepare / exec, node:sqlite, sqlite3, postgres' sql.unsafe, Prisma
// $queryRawUnsafe, knex raw, Sequelize query, libsql execute. The text is the
// first argument or a query config's `text`. Bound parameters, a tagged
// postgres template, an escaped value, a receiver whose construction is not
// visible, a literal and a z.enum argument are not. A static resource's URI
// is not client-chosen. A file with no MCP server package is not judged.
module no_sql_injection_in_tool {
  type Part = Wiring | Sinks
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None
  type Reg = Register | WholeArgs | Legacy | Named | LowLevel | Enum | ResTemplate | ResStatic
  type Sink =
    | PgPool | PgClientDefault | PgConfigText | PgConnected | Mysql2Pool
    | BetterSqlitePrepare | BetterSqliteExec | NodeSqlite | Sqlite3All
    | PostgresUnsafe | PrismaUnsafe | KnexRaw | SequelizeQuery | Libsql
    | PgBound | PostgresTagged | UnknownReceiver
  type Flow = Direct | Template | Concat | Derived | HelperReturn | Escaped | Literal

  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and r == Legacy) and not(g == McpHandler and r == LowLevel)
  pure def source(r: Reg): bool = r != Enum and r != ResStatic

  pure def carries(f: Flow): bool = match f {
    | Direct => true
    | Template => true
    | Concat => true
    | Derived => true
    | HelperReturn => true
    | Escaped => false
    | Literal => false
  }

  pure def sqlText(s: Sink): bool = match s {
    | PgBound => false
    | PostgresTagged => false
    | UnknownReceiver => false
    | _ => true
  }

  pure def reports(g: Gate, r: Reg, s: Sink, f: Flow): bool =
    mcpGate(g) and source(r) and carries(f) and sqlText(s)

  var part: Part
  var gate: Gate
  var reg: Reg
  var sink: Sink
  var flow: Flow
  var verdict: bool

  action step = {
    nondet p = Set(Wiring, Sinks).oneOf()
    nondet g = (if (p == Wiring) Set(Esm, Require, Namespace, V2, McpHandler, Lookalike, None) else Set(Esm)).oneOf()
    nondet r = (if (p == Wiring) Set(Register, WholeArgs, Legacy, Named, LowLevel, Enum, ResTemplate, ResStatic).filter(r => validReg(g, r)) else Set(Register)).oneOf()
    nondet s = (if (p == Wiring) Set(PgPool, BetterSqlitePrepare) else Set(PgPool, PgClientDefault, PgConfigText, PgConnected, Mysql2Pool, BetterSqlitePrepare, BetterSqliteExec, NodeSqlite, Sqlite3All, PostgresUnsafe, PrismaUnsafe, KnexRaw, SequelizeQuery, Libsql, PgBound, PostgresTagged, UnknownReceiver)).oneOf()
    nondet f = (if (p == Wiring) Set(Direct, Literal) else Set(Direct, Template, Concat, Derived, HelperReturn, Escaped, Literal)).oneOf()
    all {
      part' = p,
      gate' = g,
      reg' = r,
      sink' = s,
      flow' = f,
      verdict' = reports(g, r, s, f),
    }
  }

  action init = step
}
