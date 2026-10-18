// Model of the code shapes `mcp-sdk-security/no-sql-injection-in-tool` must
// judge: a tool argument (or a server constant) placed into SQL text — whole,
// interpolated, concatenated, or bound as a parameter — bound, and sent by one
// driver method. `shouldReport` is the documented contract: the argument's
// text reaches the SQL TEXT of a real driver sink (pg, mysql2, better-sqlite3,
// postgres `unsafe`, Prisma `$queryRawUnsafe`, knex `raw`, Sequelize `query`).
// A bound parameter is data; a numeric conversion carries no SQL; a method of
// the same name on something no driver built (`cache.query`) is no sink.
module mcp_sdk_security_no_sql_injection_in_tool {
  type Source = ToolArg | ServerConst
  type Position = Whole | Interp | Concat | BoundParam
  type Transform = NoTransform | Trim | NumberCast
  type Sink = PgPool | PgClientFromConnect | Mysql2Execute | BetterSqlitePrepare | PostgresUnsafe | PrismaRawUnsafe | KnexRaw | SequelizeQuery | CacheLookalike
  type Binding = Inline | ViaLet | ViaHelperSink | ViaHelperReturn

  var source: Source
  var position: Position
  var transform: Transform
  var sink: Sink
  var binding: Binding
  var expected: bool

  pure def isDriver(k: Sink): bool = match k { | CacheLookalike => false | _ => true }
  pure def inText(p: Position): bool = match p { | BoundParam => false | _ => true }
  pure def carriesSql(t: Transform): bool = match t { | NumberCast => false | _ => true }
  pure def fromClient(s: Source): bool = match s { | ToolArg => true | ServerConst => false }

  pure def shouldReport(s: Source, p: Position, t: Transform, k: Sink): bool =
    fromClient(s) and inText(p) and carriesSql(t) and isDriver(k)

  action init = all {
    nondet s = Set(ToolArg, ServerConst).oneOf()
    nondet p = Set(Whole, Interp, Concat, BoundParam).oneOf()
    nondet t = Set(NoTransform, Trim, NumberCast).oneOf()
    nondet k = Set(PgPool, PgClientFromConnect, Mysql2Execute, BetterSqlitePrepare, PostgresUnsafe, PrismaRawUnsafe, KnexRaw, SequelizeQuery, CacheLookalike).oneOf()
    nondet b = Set(Inline, ViaLet, ViaHelperSink, ViaHelperReturn).oneOf()
    all {
      source' = s, position' = p, transform' = t, sink' = k, binding' = b,
      expected' = shouldReport(s, p, t, k),
    }
  }

  action step = all {
    source' = source, position' = position, transform' = transform, sink' = sink,
    binding' = binding, expected' = expected,
  }
}
