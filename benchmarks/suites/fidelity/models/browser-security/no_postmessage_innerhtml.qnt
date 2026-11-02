// Model of eslint-plugin-browser-security/no-postmessage-innerhtml (CWE-79).
// Contract: inside a `message` handler whose receiver is positively
// window/self/globalThis (same file), writing the event's data into
// innerHTML / outerHTML / insertAdjacentHTML / document.write is reported.
// A receiver the file cannot resolve (a parameter) belongs to no-innerhtml.
module no_postmessage_innerhtml {
  type Reg = WinAEL | SelfAEL | GlobalThisAEL | WinOnMessage | ParamPort | ClickAEL
  type Sink = Inner | Outer | InsertAdj | DocWrite | TextContent
  type Value = Data | DataField | Sanitized | Lit
  type Form = ArrowEvent | FnExprE
  type Ctx = Prod | TestDefault | TestFlipped

  pure def ownedReg(r: Reg): bool = match r {
    | ParamPort => false
    | ClickAEL => false
    | _ => true
  }

  pure def htmlSink(s: Sink): bool = s != TextContent

  pure def tainted(v: Value): bool = match v {
    | Data => true
    | DataField => true
    | _ => false
  }

  // allowInTests defaults to true.
  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(r: Reg, s: Sink, v: Value, f: Form, c: Ctx): bool =
    not(skipped(c)) and ownedReg(r) and htmlSink(s) and tainted(v)

  var reg: Reg
  var sink: Sink
  var value: Value
  var form: Form
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet r = Set(WinAEL, SelfAEL, GlobalThisAEL, WinOnMessage, ParamPort, ClickAEL).oneOf()
    nondet s = Set(Inner, Outer, InsertAdj, DocWrite, TextContent).oneOf()
    nondet v = Set(Data, DataField, Sanitized, Lit).oneOf()
    nondet f = Set(ArrowEvent, FnExprE).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { reg' = r, sink' = s, value' = v, form' = f, ctx' = c, verdict' = reports(r, s, v, f, c) }
  }

  action init = step
}
