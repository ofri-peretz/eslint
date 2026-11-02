// Model of eslint-plugin-node-security/no-math-random-crypto (CWE-338).
// Math.random() is reported when its value lands in a security-named variable
// or property, or is returned from a function whose name says it generates a
// credential. Correlation ids (requestId) and benign randomness (jitter, a
// slot index) are not. Every way of reaching Math.random counts.
module no_math_random_crypto {
  // allowInTests (default true): a test file is skipped unless the option is turned
  // off. TestDefault = src/app.test.ts with the option at its default
  // (silent), TestFlip = the same file with allowInTests: false (reported as usual).
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx
  type Spelling = Direct | Bracket | Destructured | GlobalThis
  type Name = SessionToken | Salt | Iv | Nonce | RequestId | JitterMs | Slot
  type Context = VarDecl | PropAssign | ReturnFrom

  pure def secretName(n: Name): bool = match n {
    | SessionToken => true
    | Salt => true
    | Iv => true
    | Nonce => true
    | _ => false
  }

  pure def reports(sp: Spelling, n: Name, c: Context): bool = secretName(n)

  var spelling: Spelling
  var name: Name
  var context: Context
  var verdict: bool

  action step = {
    nondet sp = Set(Direct, Bracket, Destructured, GlobalThis).oneOf()
    nondet n = Set(SessionToken, Salt, Iv, Nonce, RequestId, JitterMs, Slot).oneOf()
    nondet c = Set(VarDecl, PropAssign, ReturnFrom).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { spelling' = sp, name' = n, context' = c, testCtx' = tc, verdict' = (reports(sp, n, c) and not(exempt(tc))) }
  }

  action init = step
}
