// Model of eslint-plugin-browser-security/no-worker-message-innerhtml (CWE-79).
// Contract: in a `message` handler on a receiver positively identified as
// `new Worker(...)` or `new SharedWorker(...)` (whose messages arrive on
// `.port`) in the same file, writing e.data into innerHTML / outerHTML /
// insertAdjacentHTML / document.write is reported. A parameter receiver, or a
// WebSocket, is not Worker evidence.
module no_worker_message_innerhtml {
  type Recv = WorkerConst | SharedWorkerPort | WorkerParam | WsConst
  type Reg = OnMessage | AELMessage
  type Sink = Inner | Outer | InsertAdj | DocWrite | TextContent
  type Value = Data | Sanitized | Lit
  type Ctx = Prod | TestDefault | TestFlipped

  pure def owned(r: Recv): bool = match r {
    | WorkerConst => true
    | SharedWorkerPort => true
    | _ => false
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(r: Recv, g: Reg, s: Sink, v: Value, c: Ctx): bool =
    not(skipped(c)) and owned(r) and s != TextContent and v == Data

  var recv: Recv
  var reg: Reg
  var sink: Sink
  var value: Value
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet r = Set(WorkerConst, SharedWorkerPort, WorkerParam, WsConst).oneOf()
    nondet g = Set(OnMessage, AELMessage).oneOf()
    nondet s = Set(Inner, Outer, InsertAdj, DocWrite, TextContent).oneOf()
    nondet v = Set(Data, Sanitized, Lit).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { recv' = r, reg' = g, sink' = s, value' = v, ctx' = c, verdict' = reports(r, g, s, v, c) }
  }

  action init = step
}
