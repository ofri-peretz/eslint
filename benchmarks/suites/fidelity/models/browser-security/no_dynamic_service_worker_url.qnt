// Model of eslint-plugin-browser-security/no-dynamic-service-worker-url (CWE-829).
// Contract: navigator.serviceWorker.register(url) with a URL that is not a
// static string (template with expressions, concatenation, an unknown
// identifier) is reported. A string literal, an expression-free template, or a
// const bound to a string literal is static. Other `.register` calls are out of scope.
module no_dynamic_service_worker_url {
  type Arg = Lit | TplStatic | TplExpr | Concat | Ident | ConstLit | LitWithOpts
  type Callee = Nav | WindowNav | ComputedRegister | OptionalSW | OtherRegister
  type Ctx = Prod | TestDefault | TestFlipped

  pure def dynamic(a: Arg): bool = match a {
    | TplExpr => true
    | Concat => true
    | Ident => true
    | _ => false
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(a: Arg, k: Callee, c: Ctx): bool =
    not(skipped(c)) and k != OtherRegister and dynamic(a)

  var arg: Arg
  var callee: Callee
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet a = Set(Lit, TplStatic, TplExpr, Concat, Ident, ConstLit, LitWithOpts).oneOf()
    nondet k = Set(Nav, WindowNav, ComputedRegister, OptionalSW, OtherRegister).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { arg' = a, callee' = k, ctx' = c, verdict' = reports(a, k, c) }
  }

  action init = step
}
