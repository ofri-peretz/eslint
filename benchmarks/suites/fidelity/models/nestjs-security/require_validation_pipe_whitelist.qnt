// Model of eslint-plugin-nestjs-security/require-validation-pipe-whitelist (CWE-915).
// A ValidationPipe whose options are visible in the file must set
// whitelist: true (and forbidNonWhitelisted: true under the option). Options
// that cannot be read statically — imported, spread without an override,
// a reassigned binding, a non-literal flag — are left alone.
module require_validation_pipe_whitelist {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Opts =
    | NoArg            // new ValidationPipe()
    | EmptyObj         // new ValidationPipe({})
    | TransformOnly    // { transform: true }
    | WlTrue           // { whitelist: true }
    | WlFalse          // { whitelist: false }
    | Spread           // { ...base }
    | SpreadWlFalse    // { ...base, whitelist: false } — the override is visible
    | Imported         // imported options object
    | LocalWlTrue      // const o = { whitelist: true }; new ValidationPipe(o)
    | LocalWlFalse     // const o = { transform: true }; new ValidationPipe(o)
    | LocalReassigned  // let o = { transform: true }; o = other; new ValidationPipe(o)
    | WlNonLiteral     // { whitelist: cfg.strip }
  type Callee = Plain | Aliased | Namespace
  type Site = GlobalPipes | UsePipesDeco

  // whitelist: Some(true) | Some(false) | unknown
  pure def whitelistKnownFalse(o: Opts): bool =
    o == NoArg or o == EmptyObj or o == TransformOnly or o == WlFalse
      or o == SpreadWlFalse or o == LocalWlFalse
  pure def whitelistKnownTrue(o: Opts): bool = o == WlTrue or o == LocalWlTrue
  pure def reports(o: Opts, forbid: bool, requireForbid: bool): bool =
    if (whitelistKnownFalse(o)) true
    else if (requireForbid and not(forbid) and (whitelistKnownTrue(o) or o == WlNonLiteral)) true
    else false

  var opts: Opts
  var forbid: bool
  var requireForbid: bool
  var callee: Callee
  var site: Site
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet o = Set(NoArg, EmptyObj, TransformOnly, WlTrue, WlFalse, Spread, SpreadWlFalse,
                   Imported, LocalWlTrue, LocalWlFalse, LocalReassigned, WlNonLiteral).oneOf()
    nondet f = Set(true, false).oneOf()
    nondet r = Set(true, false).oneOf()
    nondet c = Set(Plain, Aliased, Namespace).oneOf()
    nondet s = Set(GlobalPipes, UsePipesDeco).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      opts' = o, forbid' = f, requireForbid' = r, callee' = c, site' = s,
      testCtx' = tc, verdict' = (reports(o, f, r) and not(exempt(tc))),
    }
  }

  action init = step
}
