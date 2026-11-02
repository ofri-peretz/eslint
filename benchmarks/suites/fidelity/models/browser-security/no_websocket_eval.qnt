// Model of eslint-plugin-browser-security/no-websocket-eval (CWE-95).
// Contract: in a `message` handler on a receiver positively identified as
// `new WebSocket(...)` in the same file, passing message data to eval(),
// new Function() or Function() is reported. JSON.parse is the safe twin.
module no_websocket_eval {
  // Test-file context: Prod is src/a.ts, TestDefault a test file under the
  // default options, TestFlipped a test file with allowInTests set opposite to
  // its default. Outside Prod every dimension but the value is pinned to one
  // representative, so the option is covered on tainted and safe inputs
  // without multiplying the domain.
  type Ctx = Prod | TestDefault | TestFlipped

  pure def skipped(c: Ctx): bool = c == TestDefault
  type Recv = WsConst | WsParam | WorkerConst
  type Reg = OnMessage | AELMessage | AELOpen
  type Sink = Eval | NewFunction | CallFunction | WindowEval | JsonParse
  type Value = Data | DataField | Lit

  pure def codeSink(s: Sink): bool = s != JsonParse

  pure def tainted(v: Value): bool = v != Lit

  pure def reports(r: Recv, g: Reg, s: Sink, v: Value): bool =
    r == WsConst and g != AELOpen and codeSink(s) and tainted(v)

  var recv: Recv
  var reg: Reg
  var sink: Sink
  var value: Value
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    nondet r0 = Set(WsConst, WsParam, WorkerConst).oneOf()
    nondet g0 = Set(OnMessage, AELMessage, AELOpen).oneOf()
    nondet s0 = Set(Eval, NewFunction, CallFunction, WindowEval, JsonParse).oneOf()
    nondet v = Set(Data, DataField, Lit).oneOf()
    val r = if (x == Prod) r0 else WsConst
    val g = if (x == Prod) g0 else OnMessage
    val s = if (x == Prod) s0 else Eval
    all {
      recv' = r, reg' = g, sink' = s, value' = v, ctx' = x,
      verdict' = (not(skipped(x)) and reports(r, g, s, v)),
    }
  }

  action init = step
}
