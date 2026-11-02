// Model of eslint-plugin-nestjs-security/no-unguarded-swagger (CWE-200).
// SwaggerModule.setup() reached unconditionally from a bootstrap function (one
// that also calls NestFactory.create) is reported. Any condition around it,
// a helper that only receives `app`, or createDocument alone is not.
module no_unguarded_swagger {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Ctx = Bootstrap | Helper
  type Guard =
    | NoGuard
    | IfBlock      // if (cfg.enabled) { … }
    | LogicalAnd   // cfg.enabled && SwaggerModule.setup(…)
    | Ternary      // cfg.enabled ? SwaggerModule.setup(…) : undefined
    | TryBlock     // try { … } — not a condition
  type Call = Setup | CreateDocumentOnly
  type Spelling = DotCall | BracketCall | AliasedImport
  type Form = FuncDecl | ArrowConst

  pure def reports(c: Ctx, g: Guard, k: Call, sp: Spelling, f: Form): bool =
    c == Bootstrap and k == Setup and (g == NoGuard or g == TryBlock)

  var ctx: Ctx
  var guard: Guard
  var call: Call
  var spelling: Spelling
  var form: Form
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet c = Set(Bootstrap, Helper).oneOf()
    nondet g = Set(NoGuard, IfBlock, LogicalAnd, Ternary, TryBlock).oneOf()
    nondet k = Set(Setup, CreateDocumentOnly).oneOf()
    nondet sp = Set(DotCall, BracketCall, AliasedImport).oneOf()
    nondet f = Set(FuncDecl, ArrowConst).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      ctx' = c, guard' = g, call' = k, spelling' = sp, form' = f,
      testCtx' = tc, verdict' = (reports(c, g, k, sp, f) and not(exempt(tc))),
    }
  }

  action init = step
}
