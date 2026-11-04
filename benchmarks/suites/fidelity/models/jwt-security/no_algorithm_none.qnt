// Model of eslint-plugin-jwt-security/no-algorithm-none (CWE-347, CVE-2022-23540).
// A sign or verify that asks for the unsigned "none" algorithm, in any letter
// case, or whose whitelist is empty, lets anyone forge a token. Options are
// read inline, through a same-file const, and through a spread of that const;
// a spread of a call is invisible. No JWT import, no JWT call.
module no_algorithm_none {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx

  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport
  type Opts =
    | VerifyAlgNone | VerifyAlgNoneUpper | VerifyAlgNoneTitle | VerifyAlgRs
    | VerifyAlgsNone | VerifyAlgsMixed | VerifyAlgsEmpty | VerifyAlgsSafe
    | VerifyNoOpts | VerifyConstNone | VerifySpreadConstNone | VerifySpreadCall
    | SignAlgNone | SignAlgHs | SignConstNone

  pure def unsafe(o: Opts): bool = match o {
    | VerifyAlgNone => true
    | VerifyAlgNoneUpper => true
    | VerifyAlgNoneTitle => true
    | VerifyAlgRs => false
    | VerifyAlgsNone => true
    | VerifyAlgsMixed => true
    | VerifyAlgsEmpty => true
    | VerifyAlgsSafe => false
    | VerifyNoOpts => false
    | VerifyConstNone => true
    | VerifySpreadConstNone => true
    | VerifySpreadCall => false
    | SignAlgNone => true
    | SignAlgHs => false
    | SignConstNone => true
  }

  pure def reports(sp: Spelling, o: Opts): bool = sp != NoImport and unsafe(o)

  var spelling: Spelling
  var opts: Opts
  var verdict: bool

  action step = {
    nondet sp = Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport).oneOf()
    nondet o = Set(
      VerifyAlgNone, VerifyAlgNoneUpper, VerifyAlgNoneTitle, VerifyAlgRs,
      VerifyAlgsNone, VerifyAlgsMixed, VerifyAlgsEmpty, VerifyAlgsSafe,
      VerifyNoOpts, VerifyConstNone, VerifySpreadConstNone, VerifySpreadCall,
      SignAlgNone, SignAlgHs, SignConstNone,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      spelling' = sp,
      opts' = o,
      testCtx' = tc,
      verdict' = (reports(sp, o) and not(exempt(tc))),
    }
  }

  action init = step
}
