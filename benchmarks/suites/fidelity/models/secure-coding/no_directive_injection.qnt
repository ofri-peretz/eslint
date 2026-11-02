// Model of eslint-plugin-secure-coding/no-directive-injection (CWE-94).
// Contract: user-controlled input (a name in userInputVariables, or a request
// member) rendered as markup — innerHTML / outerHTML / dangerouslySetInnerHTML —
// is reported. A constant, a value passed through a sanitizer (DOMPurify), or a
// value whose name is not user input, is not.
module no_directive_injection {
  type Sink = InnerHTML | OuterHTML | DangerouslySet
  type Value = UserInputVar | ReqBody | Const | Sanitized | NeutralVar

  pure def reports(v: Value): bool = Set(UserInputVar, ReqBody).contains(v)

  var sink: Sink
  var value: Value
  var verdict: bool

  action step = {
    nondet k = Set(InnerHTML, OuterHTML, DangerouslySet).oneOf()
    nondet v = Set(UserInputVar, ReqBody, Const, Sanitized, NeutralVar).oneOf()
    all { sink' = k, value' = v, verdict' = reports(v) }
  }

  action init = step
}
