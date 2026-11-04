// Model of eslint-plugin-jwt-security/no-timestamp-manipulation (CWE-294).
// Three ways to keep a token alive past its time: signing without iat
// (`noTimestamp: true`), verifying while ignoring exp (`ignoreExpiration:
// true`, jsonwebtoken or passport-jwt), and a clockTolerance wider than
// `maxClockToleranceSeconds` (default 300). A tolerance is judged only when it
// is a number in every run (a literal, a const, arithmetic over those); a
// duration string or a runtime value is not. Options are read inline, through
// a const, a cast and a spread of a const.
module no_timestamp_manipulation {
  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport
  type Opts =
    | SignNoTsTrue | SignNoTsFalse | SignNoOpts | SignNoTsRuntime
    | SignConstNoTs | SignSpreadConstNoTs | SignCastNoTs
    | VerifyIgnoreExpTrue | VerifyIgnoreExpFalse
    | VerifyTol30 | VerifyTol300 | VerifyTolYear | VerifyTolConst600
    | VerifyTolString | VerifyTolRuntime
    | PassportIgnoreExp

  // tol: the numeric clockTolerance, -1 when there is none to judge.
  pure def tolerance(o: Opts): int = match o {
    | VerifyTol30 => 30
    | VerifyTol300 => 300
    | VerifyTolYear => 31536000
    | VerifyTolConst600 => 600
    | _ => -1
  }

  pure def unsafe(o: Opts, maxTol: int): bool = match o {
    | SignNoTsTrue => true
    | SignConstNoTs => true
    | SignSpreadConstNoTs => true
    | SignCastNoTs => true
    | VerifyIgnoreExpTrue => true
    | PassportIgnoreExp => true
    | _ => tolerance(o) > maxTol
  }

  // passport-jwt carries its own import, which opens the file gate.
  pure def reports(sp: Spelling, o: Opts, maxTol: int): bool =
    (sp != NoImport or o == PassportIgnoreExp) and unsafe(o, maxTol)

  var spelling: Spelling
  var opts: Opts
  var maxTol: int
  var verdict: bool

  action step = {
    nondet sp = Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport).oneOf()
    nondet o = Set(
      SignNoTsTrue, SignNoTsFalse, SignNoOpts, SignNoTsRuntime,
      SignConstNoTs, SignSpreadConstNoTs, SignCastNoTs,
      VerifyIgnoreExpTrue, VerifyIgnoreExpFalse,
      VerifyTol30, VerifyTol300, VerifyTolYear, VerifyTolConst600,
      VerifyTolString, VerifyTolRuntime,
      PassportIgnoreExp,
    ).oneOf()
    // 300 is the default; 10 the non-default.
    nondet m = Set(300, 10).oneOf()
    all {
      spelling' = sp,
      opts' = o,
      maxTol' = m,
      verdict' = reports(sp, o, m),
    }
  }

  action init = step
}
