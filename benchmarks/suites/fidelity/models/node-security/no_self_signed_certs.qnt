// Model of eslint-plugin-node-security/no-self-signed-certs (CWE-295).
// Certificate validation turned off is reported: rejectUnauthorized set to
// false (in a request, an Agent, tls.connect, a quoted key, after a spread,
// or through a const in the same scope) and NODE_TLS_REJECT_UNAUTHORIZED
// written as 0 through process.env, a subscript or globalThis.process.env,
// with the value as a string, a template or a number. The safe twin of every
// shape (true / '1') is not.
module no_self_signed_certs {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Sink = RequestOption | AgentOption | TlsConnect | QuotedKey | AfterSpread | ConstValue | EnvDot | EnvSubscript | EnvGlobalThis | EnvNumber | EnvTemplate

  pure def reports(s: Sink, disabled: bool): bool = disabled

  var sink: Sink
  var disabled: bool
  var verdict: bool

  action step = {
    nondet s = Set(RequestOption, AgentOption, TlsConnect, QuotedKey, AfterSpread, ConstValue, EnvDot, EnvSubscript, EnvGlobalThis, EnvNumber, EnvTemplate).oneOf()
    nondet d = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { sink' = s, disabled' = d, testCtx' = tc, verdict' = (reports(s, d) and not(exempt(tc))) }
  }

  action init = step
}
