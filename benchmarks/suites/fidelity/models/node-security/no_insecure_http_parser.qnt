// Model of eslint-plugin-node-security/no-insecure-http-parser (CWE-444).
// The property insecureHTTPParser set to a literal true is the finding,
// wherever it is written: inline in createServer / request / an Agent, in an
// options const, a quoted key, or a later (dot or subscript) assignment.
// false and a non-literal value are not reported.
module no_insecure_http_parser {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Site = CreateServerInline | RequestInline | AgentInline | OptionsConst | QuotedKey | AssignLater | SubscriptAssign
  type Value = LitTrue | LitFalse | Runtime

  pure def reports(s: Site, v: Value): bool = v == LitTrue

  var site: Site
  var value: Value
  var verdict: bool

  action step = {
    nondet s = Set(CreateServerInline, RequestInline, AgentInline, OptionsConst, QuotedKey, AssignLater, SubscriptAssign).oneOf()
    nondet v = Set(LitTrue, LitFalse, Runtime).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { site' = s, value' = v, testCtx' = tc, verdict' = (reports(s, v) and not(exempt(tc))) }
  }

  action init = step
}
