// Model of eslint-plugin-secure-coding/no-sql-injection (CWE-89).
// Contract: reported only in a file that imports no SQL driver, and only when all
// four hold: a raw-SQL sink (.query / .execute), a built string (concatenation,
// interpolation, or a built `text` in a query-config object), a SQL statement
// shape (SELECT ... FROM), and an attributable source: a request member read
// directly or through a written-once local, or a function parameter while
// treatParametersAsUntrusted is on. String() is transparent; any other wrapping
// call (escapeIdentifier) breaks attribution, whether imported or an ambient
// `declare function` with no body; req.locals is server-set.
module no_sql_injection {
  type Driver = NoDriver | PgDriver
  type Sink = Query | Execute | Run
  type Build = Concat | Template | ConfigText | Bound | Plain
  type Shape = Select | StatusMsg
  type Source = ReqDirect | ReqHop | ParamOn | ParamOff | Escaped | EscapedAmbient | Locals | StringWrap

  pure def attributable(s: Source): bool = Set(ReqDirect, ReqHop, ParamOn, StringWrap).contains(s)

  pure def reports(d: Driver, k: Sink, b: Build, sh: Shape, s: Source): bool =
    d == NoDriver and Set(Query, Execute).contains(k)
    and Set(Concat, Template, ConfigText).contains(b)
    and sh == Select and attributable(s)

  var driver: Driver
  var sink: Sink
  var build: Build
  var shape: Shape
  var source: Source
  var verdict: bool

  action step = {
    nondet d = Set(NoDriver, PgDriver).oneOf()
    nondet k = Set(Query, Execute, Run).oneOf()
    nondet b = Set(Concat, Template, ConfigText, Bound, Plain).oneOf()
    nondet sh = Set(Select, StatusMsg).oneOf()
    nondet s = Set(ReqDirect, ReqHop, ParamOn, ParamOff, Escaped, EscapedAmbient, Locals, StringWrap).oneOf()
    all { driver' = d, sink' = k, build' = b, shape' = sh, source' = s, verdict' = reports(d, k, b, sh, s) }
  }

  action init = step
}
