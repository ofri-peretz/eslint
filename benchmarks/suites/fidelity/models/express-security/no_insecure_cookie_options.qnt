// Model of eslint-plugin-express-security/no-insecure-cookie-options (CWE-614, CWE-1004).
// res.cookie(name, value, opts) in an Express file must set httpOnly: true,
// secure: true and an acceptable sameSite ('strict' | 'lax' by default; `true`
// is Express's spelling of Strict). Each require* option switches its check
// off; acceptableSameSiteValues narrows the list. A spread may carry any flag,
// so a spread-only literal is not provably insecure. No Express evidence: no
// report. allowInTests (default false) exempts test files only when turned on.
module no_insecure_cookie_options {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Flag = FAbsent | FTrue | FFalse
  type Same = SAbsent | SStrict | SLax | SNone | STrue
  type Opts = NoOpts | Spread | Lit
  type Cfg = Default | NoHttpOnlyReq | NoSecureReq | NoSameSiteReq | StrictOnly
  type Evidence = EsmImport | CjsRequire | NoExpress
  type Recv = Res | Response

  pure def sameOk(s: Same, c: Cfg): bool =
    if (c == NoSameSiteReq) true
    else if (c == StrictOnly) s == SStrict or s == STrue
    else s == SStrict or s == SLax or s == STrue

  pure def insecure(o: Opts, h: Flag, sec: Flag, s: Same, c: Cfg): bool = match o {
    | NoOpts => true // every config here still requires at least one flag
    | Spread => false
    | Lit =>
      (c != NoHttpOnlyReq and h != FTrue)
        or (c != NoSecureReq and sec != FTrue)
        or not(sameOk(s, c))
  }

  // One context per input: spellings and the test file are crossed with the
  // default config; each non-default config is sampled on the plain spelling.
  type Ctx =
    | DefEsmRes | DefCjsRes | DefNoExpress | DefEsmResponse
    | DefRouter      // express.Router() handler
    | DefChained     // res.status(200).cookie(...)
    | DefBracket     // res['cookie'](...)
    | DefTestFile | FlipTestFile
    | CfgNoHttpOnly | CfgNoSecure | CfgNoSameSite | CfgStrictOnly

  pure def cfgOf(x: Ctx): Cfg = match x {
    | CfgNoHttpOnly => NoHttpOnlyReq
    | CfgNoSecure => NoSecureReq
    | CfgNoSameSite => NoSameSiteReq
    | CfgStrictOnly => StrictOnly
    | _ => Default
  }
  pure def testOf(x: Ctx): TestCtx = match x {
    | DefTestFile => TestDefault
    | FlipTestFile => TestFlip
    | _ => Prod
  }

  var opts: Opts
  var httpOnly: Flag
  var secure: Flag
  var sameSite: Same
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet o = Set(NoOpts, Spread, Lit).oneOf()
    nondet h = (if (o == Lit) Set(FAbsent, FTrue, FFalse) else Set(FAbsent)).oneOf()
    nondet sc = (if (o == Lit) Set(FAbsent, FTrue, FFalse) else Set(FAbsent)).oneOf()
    nondet ss = (if (o == Lit) Set(SAbsent, SStrict, SLax, SNone, STrue) else Set(SAbsent)).oneOf()
    nondet x = Set(DefEsmRes, DefCjsRes, DefNoExpress, DefEsmResponse, DefRouter, DefChained, DefBracket, DefTestFile, FlipTestFile,
                   CfgNoHttpOnly, CfgNoSecure, CfgNoSameSite, CfgStrictOnly).oneOf()
    all {
      opts' = o, httpOnly' = h, secure' = sc, sameSite' = ss, ctx' = x,
      verdict' = (insecure(o, h, sc, ss, cfgOf(x)) and x != DefNoExpress and not(exempt(testOf(x)))),
    }
  }

  action init = step
}
