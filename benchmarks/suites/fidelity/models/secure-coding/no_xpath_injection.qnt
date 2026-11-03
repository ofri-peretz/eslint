// Model of eslint-plugin-secure-coding/no-xpath-injection (CWE-643).
// Contract: an XPath expression built by interpolation or concatenation of an
// unescaped value is reported, whether it is evaluated or only assigned (the doc's
// incorrect examples are bare assignments). Escaping through an XPath validation
// function makes it safe. A constant XPath is not reported by default
// (reportDangerousConstructs: false). A TypeScript cast or a ternary arm
// between the built expression and the evaluator does not hide the evaluator.
module no_xpath_injection {
  type Build = Template | Concat | Const
  type Wrap = Raw | Escaped
  type Sink = AssignOnly | DomEvaluate | XpathSelect | XpathSelectCast | XpathSelectTernary
  type Value = ReqQuery | PlainVar

  pure def reports(b: Build, w: Wrap): bool = b != Const and w == Raw

  var build: Build
  var wrap: Wrap
  var sink: Sink
  var value: Value
  var verdict: bool

  action step = {
    nondet b = Set(Template, Concat, Const).oneOf()
    nondet w = Set(Raw, Escaped).oneOf()
    nondet k = Set(AssignOnly, DomEvaluate, XpathSelect, XpathSelectCast, XpathSelectTernary).oneOf()
    nondet v = Set(ReqQuery, PlainVar).oneOf()
    all { build' = b, wrap' = w, sink' = k, value' = v, verdict' = reports(b, w) }
  }

  action init = step
}
