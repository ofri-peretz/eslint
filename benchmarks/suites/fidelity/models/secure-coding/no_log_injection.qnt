// Model of eslint-plugin-secure-coding/no-log-injection (CWE-117).
// Contract: a call <receiver>.<level>(...) whose receiver is a logger name
// (console, log, logger, winston, pino, bunyan; directly or as a property such
// as this.logger / req.log / fastify.log) and whose message is a template literal
// or `+` concatenation embedding a request member, directly or through ONE local
// binding hop. Structured (object) arguments, a literal message with the value as
// a separate argument, any wrapping call, two hops, and a parameter are silent
// by contract. A non-logger receiver (span.error) is never a sink.
module no_log_injection {
  type Recv = Console | Logger | ThisLogger | ReqLog | FastifyLog | Span
  type Shape = Concat | Template | ObjectArg | SeparateArg
  type Source = ReqBody | OneHop | TwoHop | Wrapped | Param | LocalCount

  pure def reports(r: Recv, sh: Shape, s: Source): bool =
    r != Span and Set(Concat, Template).contains(sh) and Set(ReqBody, OneHop).contains(s)

  var recv: Recv
  var shape: Shape
  var source: Source
  var verdict: bool

  action step = {
    nondet r = Set(Console, Logger, ThisLogger, ReqLog, FastifyLog, Span).oneOf()
    nondet sh = Set(Concat, Template, ObjectArg, SeparateArg).oneOf()
    nondet s = Set(ReqBody, OneHop, TwoHop, Wrapped, Param, LocalCount).oneOf()
    all { recv' = r, shape' = sh, source' = s, verdict' = reports(r, sh, s) }
  }

  action init = step
}
