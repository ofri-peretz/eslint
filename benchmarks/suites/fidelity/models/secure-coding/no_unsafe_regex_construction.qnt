// Model of eslint-plugin-secure-coding/no-unsafe-regex-construction (CWE-400).
// Contract: a RegExp built from input whose source the rule can NAME is
// reported: a request member, read directly, through a local, or spliced into
// a template. A bare function parameter has no attributable source and is left
// to detect-non-literal-regexp (the doc's ❌ example once said otherwise and was
// corrected: the two rules are disjoint by design). Passing input through a
// trusted escaping function makes it safe. A literal pattern is allowed while
// allowLiterals (default true); a const-bound literal is constant.
module no_unsafe_regex_construction {
  type Call = NewRegExp | CallRegExp
  type Pattern = ReqQuery | ReqHop | TemplateReq | Param | TemplateParam | Escaped | EscapedTemplate | Literal | ConstBound

  pure def reports(p: Pattern, allowLiterals: bool): bool =
    Set(ReqQuery, ReqHop, TemplateReq).contains(p) or (p == Literal and not(allowLiterals))

  var call: Call
  var pattern: Pattern
  var allowLiterals: bool
  var verdict: bool

  action step = {
    nondet c = Set(NewRegExp, CallRegExp).oneOf()
    nondet p = Set(ReqQuery, ReqHop, TemplateReq, Param, TemplateParam, Escaped, EscapedTemplate, Literal, ConstBound).oneOf()
    nondet a = (if (p == Literal) Set(true, false) else Set(true)).oneOf()
    all { call' = c, pattern' = p, allowLiterals' = a, verdict' = reports(p, a) }
  }

  action init = step
}
