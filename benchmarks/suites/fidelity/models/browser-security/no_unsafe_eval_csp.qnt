// Model of eslint-plugin-browser-security/no-unsafe-eval-csp (CWE-95).
// Contract: a Content-Security-Policy string (a literal, template, setHeader
// value or meta content) whose source list contains 'unsafe-eval' is reported.
// CSP keywords are ASCII case-insensitive (CSP3). Prose that merely names the
// keyword is not a policy; other keywords (nonces, hashes, 'wasm-unsafe-eval') are fine.
module no_unsafe_eval_csp {
  type Context = ConstLit | Template | TemplateExpr | SetHeader | MetaObject
  type Policy = ScriptUE | Combined | Wasm | Self | Nonce | Upper | Prose | InlineOnly
  type Ctx = Prod | TestDefault | TestFlipped

  pure def unsafe(p: Policy): bool = match p {
    | ScriptUE => true
    | Combined => true
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
    nondet p = Set(ScriptUE, Combined, Wasm, Self, Nonce, Upper, Prose, InlineOnly).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { context' = x, policy' = p, ctx' = c, verdict' = reports(x, p, c) }
  }

  action init = step
}
