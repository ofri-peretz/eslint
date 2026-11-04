// Model of eslint-plugin-jwt-security/require-expiration (CWE-613).
// A token signed with no expiry is valid forever. `expiresIn` (inline, in a
// const, behind a cast, spread from a const) or an `exp` claim in the payload
// satisfies it; for jose, `setExpirationTime` on the builder, inline or in its
// own statement. Options from a call or a parameter may carry it: silent. A
// payload that is a parameter is still reported when no expiresIn is visible.
// `maxExpirationSeconds` (opt-in) also reports a lifetime the file states
// statically and that exceeds it: expiresIn as seconds, as an `ms` string
// (a bare numeric string is milliseconds), or `exp` as now + a constant. A
// lifetime from env, or an absolute exp, is not judged.
module require_expiration {
  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport | JoseChain
  type Lifetime =
    | NoOptions | EmptyOptions | OtherOptionOnly
    | ExpiresIn15m | ExpiresIn7d | ExpiresInSeconds3600 | ExpiresInArith1d | ExpiresInMsString
    | ExpiresInConst2h | ExpiresInEnv | ConstOptions15m | CastOptionsEnv | SpreadConst7d
    | PayloadExp1h | PayloadExp30d | PayloadExpAbsolute
    | OptionsFromCall | OptionsFromParam
    | JoseNoExpiry | JoseInline1h | JoseSeparate1h

  // Seconds of lifetime the file states; -1 when it states none to judge.
  pure def seconds(l: Lifetime): int = match l {
    | ExpiresIn15m => 900
    | ExpiresIn7d => 604800
    | ExpiresInSeconds3600 => 3600
    | ExpiresInArith1d => 86400
    | ExpiresInMsString => 7
    | ExpiresInConst2h => 7200
    | ConstOptions15m => 900
    | SpreadConst7d => 604800
    | PayloadExp1h => 3600
    | PayloadExp30d => 2592000
    | _ => -1
  }

  pure def missing(l: Lifetime): bool =
    Set(NoOptions, EmptyOptions, OtherOptionOnly, JoseNoExpiry).contains(l)

  // maxSecs: 0 = option unset.
  pure def reports(sp: Spelling, l: Lifetime, maxSecs: int): bool =
    sp != NoImport and (missing(l) or (maxSecs > 0 and seconds(l) > maxSecs))

  var spelling: Spelling
  var lifetime: Lifetime
  var maxSecs: int
  var verdict: bool

  action step = {
    nondet sp = Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport, JoseChain).oneOf()
    nondet l = (if (sp == JoseChain) Set(JoseNoExpiry, JoseInline1h, JoseSeparate1h) else Set(
      NoOptions, EmptyOptions, OtherOptionOnly,
      ExpiresIn15m, ExpiresIn7d, ExpiresInSeconds3600, ExpiresInArith1d, ExpiresInMsString,
      ExpiresInConst2h, ExpiresInEnv, ConstOptions15m, CastOptionsEnv, SpreadConst7d,
      PayloadExp1h, PayloadExp30d, PayloadExpAbsolute,
      OptionsFromCall, OptionsFromParam,
    )).oneOf()
    nondet m = Set(0, 3600).oneOf()
    all {
      spelling' = sp,
      lifetime' = l,
      maxSecs' = m,
      verdict' = reports(sp, l, m),
    }
  }

  action init = step
}
