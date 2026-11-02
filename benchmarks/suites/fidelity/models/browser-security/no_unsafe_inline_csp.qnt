// Model of eslint-plugin-browser-security/no-unsafe-inline-csp (CWE-79).
// Contract: a Content-Security-Policy string (a literal, template, setHeader
// value or meta content) whose source list contains 'unsafe-inline' is reported.
// CSP keywords are ASCII case-insensitive (CSP3). Prose that merely names the
// keyword is not a policy; other keywords (nonces, hashes, 'unsafe-hashes') are fine.
module no_unsafe_inline_csp {
  type Context = ConstLit | Template | TemplateExpr | SetHeader | MetaObject
  type Policy = ScriptUI | StyleUI | Nonce | Hash | Self | Upper | Prose | UnsafeHashes
  type Ctx = Prod | TestDefault | TestFlipped

  pure def unsafe(p: Policy): bool = match p {
    | ScriptUI => true
    | StyleUI => true
    | Upper => true
    | _ => false
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(x: Context, p: Policy, c: Ctx): bool = not(skipped(c)) and unsafe(p)

  var context: Context
  var policy: Policy
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(ConstLit, Template, TemplateExpr, SetHeader, MetaObject).oneOf()
    nondet p = Set(ScriptUI, StyleUI, Nonce, Hash, Self, Upper, Prose, UnsafeHashes).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { context' = x, policy' = p, ctx' = c, verdict' = reports(x, p, c) }
  }

  action init = step
}
