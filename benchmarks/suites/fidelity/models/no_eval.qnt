// Model of eslint-plugin-browser-security/no-eval (CWE-95).
// Abstracts the AST into the call-site shape the rule branches on.
module no_eval {
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
  var verdict: bool

  action step = {
    nondet a = Set(true, false).oneOf()
    nondet c = Set(IdentEval, IdentExecScript, MemberEval, ComputedEvalLit, SetTimeoutStr, SetTimeoutFn, NewFunction, NewOther, OtherCall).oneOf()
    all {
      allowFn' = a,
      callee' = c,
      verdict' = reports(c, a),
    }
  }

  action init = step

  // Sanity: a plain function call is never reported.
  val plainCallNeverReported = (callee != OtherCall) or not(verdict)
}
