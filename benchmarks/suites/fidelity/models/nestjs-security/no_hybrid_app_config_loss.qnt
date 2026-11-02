// Model of eslint-plugin-nestjs-security/no-hybrid-app-config-loss (CWE-20).
// app.connectMicroservice() whose hybrid options provably lack
// inheritAppConfig: true is reported. A spread that could carry the flag, an
// options object built elsewhere, or a non-literal value is not; nor is
// NestJS's own `this.connectMicroservice` inside its implementation class.
module no_hybrid_app_config_loss {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Hybrid =
    | NoSecondArg
    | EmptyObj               // {}
    | OtherKeyOnly           // { foo: 1 }
    | InheritTrue            // { inheritAppConfig: true }
    | InheritFalse           // { inheritAppConfig: false }
    | SpreadOnly             // { ...hybridOptions }
    | SpreadThenFalse        // { ...hybridOptions, inheritAppConfig: false }
    | FalseThenSpread        // { inheritAppConfig: false, ...hybridOptions }
    | ExternalVar            // hybridOptions
    | NonLiteral             // { inheritAppConfig: config.inherit }
  type Receiver = AppDot | AppBracket | AppOptional | ThisInFramework

  pure def lacksFlag(h: Hybrid): bool =
    h == NoSecondArg or h == EmptyObj or h == OtherKeyOnly or h == InheritFalse or h == SpreadThenFalse

  pure def reports(h: Hybrid, r: Receiver, generic: bool): bool =
    r != ThisInFramework and lacksFlag(h)

  var hybrid: Hybrid
  var receiver: Receiver
  var generic: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet h = Set(NoSecondArg, EmptyObj, OtherKeyOnly, InheritTrue, InheritFalse, SpreadOnly,
                   SpreadThenFalse, FalseThenSpread, ExternalVar, NonLiteral).oneOf()
    nondet r = Set(AppDot, AppBracket, AppOptional, ThisInFramework).oneOf()
    nondet g = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { hybrid' = h, receiver' = r, generic' = g, testCtx' = tc, verdict' = (reports(h, r, g) and not(exempt(tc))) }
  }

  action init = step
}
