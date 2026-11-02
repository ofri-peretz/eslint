// Model of eslint-plugin-browser-security/no-filereader-innerhtml (CWE-79).
// Contract: in a load / loadend handler on a receiver positively identified as
// `new FileReader()` in the same file, writing the read result (e.target.result,
// or reader.result) into innerHTML / outerHTML / insertAdjacentHTML /
// document.write is reported. A parameter receiver, or an Image, is not evidence.
module no_filereader_innerhtml {
  // Test-file context: Prod is src/a.ts, TestDefault a test file under the
  // default options, TestFlipped a test file with allowInTests set opposite to
  // its default. Outside Prod every dimension but the value is pinned to one
  // representative, so the option is covered on tainted and safe inputs
  // without multiplying the domain.
  type Ctx = Prod | TestDefault | TestFlipped

  pure def skipped(c: Ctx): bool = c == TestDefault
  type Recv = ReaderConst | ReaderParam | ImageConst
  type Reg = OnLoad | OnLoadEnd | AELLoad
  type Sink = Inner | Outer | InsertAdj | DocWrite | TextContent
  type Value = TargetResult | ReaderResult | Sanitized | Lit

  pure def tainted(v: Value): bool = match v {
    | TargetResult => true
    | ReaderResult => true
    | _ => false
  }

  pure def reports(r: Recv, g: Reg, s: Sink, v: Value): bool =
    r == ReaderConst and s != TextContent and tainted(v)

  var recv: Recv
  var reg: Reg
  var sink: Sink
  var value: Value
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    nondet r0 = Set(ReaderConst, ReaderParam, ImageConst).oneOf()
    nondet g0 = Set(OnLoad, OnLoadEnd, AELLoad).oneOf()
    nondet s0 = Set(Inner, Outer, InsertAdj, DocWrite, TextContent).oneOf()
    nondet v = Set(TargetResult, ReaderResult, Sanitized, Lit).oneOf()
    val r = if (x == Prod) r0 else ReaderConst
    val g = if (x == Prod) g0 else OnLoad
    val s = if (x == Prod) s0 else Inner
    all {
      recv' = r, reg' = g, sink' = s, value' = v, ctx' = x,
      verdict' = (not(skipped(x)) and reports(r, g, s, v)),
    }
  }

  action init = step
}
