// Model of eslint-plugin-browser-security/no-eval (CWE-95).
// Abstracts the AST into the call-site shape the rule branches on.
module no_eval {
  // Test-file context: Prod is src/a.ts, TestDefault a test file under the
  // default options, TestFlipped a test file with allowInTests set opposite to
  // its default. Outside Prod every dimension but the callee is pinned to one
  // representative, so the option is covered on tainted and safe inputs
  // without multiplying the domain.
  type Ctx = Prod | TestDefault | TestFlipped

  pure def skipped(c: Ctx): bool = c == TestFlipped
  type Callee =
    | IdentEval
    | IdentExecScript
    | MemberEval
    | ComputedEvalLit
    | SetTimeoutStr
    | SetTimeoutFn
    | NewFunction
    | NewOther
    | OtherCall

  pure def reports(c: Callee, allowFn: bool): bool = match c {
    | IdentEval => true
    | IdentExecScript => true
    | MemberEval => true
    | ComputedEvalLit => true
    | SetTimeoutStr => true
    | SetTimeoutFn => false
    | NewFunction => not(allowFn)
    | NewOther => false
    | OtherCall => false
  }

  var allowFn: bool
  var callee: Callee
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    nondet a0 = Set(true, false).oneOf()
    nondet c = Set(IdentEval, IdentExecScript, MemberEval, ComputedEvalLit, SetTimeoutStr, SetTimeoutFn, NewFunction, NewOther, OtherCall).oneOf()
    val a = if (x == Prod) a0 else false
    all {
      allowFn' = a,
      callee' = c,
      ctx' = x,
      verdict' = (not(skipped(x)) and reports(c, a)),
    }
  }

  action init = step

  // Sanity: a plain function call is never reported.
  val plainCallNeverReported = (callee != OtherCall) or not(verdict)
}
