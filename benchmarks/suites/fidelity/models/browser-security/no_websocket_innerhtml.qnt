// Model of eslint-plugin-browser-security/no-websocket-innerhtml (CWE-79).
// Contract: in a `message` handler on a receiver positively identified as
// `new WebSocket(...)` in the same file, writing the message data into
// innerHTML / outerHTML / insertAdjacentHTML / document.write is reported.
// A parameter receiver, or a Worker, is not WebSocket evidence.
module no_websocket_innerhtml {
  // Test-file context: Prod is src/a.ts, TestDefault a test file under the
  // default options, TestFlipped a test file with allowInTests set opposite to
  // its default. Outside Prod every dimension but the value is pinned to one
  // representative, so the option is covered on tainted and safe inputs
  // without multiplying the domain.
  type Ctx = Prod | TestDefault | TestFlipped

  pure def skipped(c: Ctx): bool = c == TestDefault
  type Recv = WsConst | WsParam | WorkerConst
  type Reg = OnMessage | AELMessage | AELOpen
  type Sink = Inner | Outer | InsertAdj | DocWrite | TextContent
  type Value = Data | DataField | Sanitized | Lit
  type Form = ArrowEvent | FnExprMsg

  pure def tainted(v: Value): bool = match v {
    | Data => true
    | DataField => true
    | _ => false
  }

  pure def reports(r: Recv, g: Reg, s: Sink, v: Value, f: Form): bool =
    r == WsConst and g != AELOpen and s != TextContent and tainted(v)

  var recv: Recv
  var reg: Reg
  var sink: Sink
  var value: Value
  var form: Form
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    nondet r0 = Set(WsConst, WsParam, WorkerConst).oneOf()
    nondet g0 = Set(OnMessage, AELMessage, AELOpen).oneOf()
    nondet s0 = Set(Inner, Outer, InsertAdj, DocWrite, TextContent).oneOf()
    nondet v = Set(Data, DataField, Sanitized, Lit).oneOf()
    nondet f0 = Set(ArrowEvent, FnExprMsg).oneOf()
    val r = if (x == Prod) r0 else WsConst
    val g = if (x == Prod) g0 else OnMessage
    val s = if (x == Prod) s0 else Inner
    val f = if (x == Prod) f0 else ArrowEvent
    all {
      recv' = r, reg' = g, sink' = s, value' = v, form' = f, ctx' = x,
      verdict' = (not(skipped(x)) and reports(r, g, s, v, f)),
    }
  }

  action init = step
}
