// Model of eslint-plugin-jwt-security/require-issued-at (CWE-294).
// A token needs an iat for freshness checks. jsonwebtoken adds it unless
// noTimestamp is set, so only a noTimestamp chosen at runtime is asked about
// here (a literal `true` is no-timestamp-manipulation's finding: one defect,
// one report). An explicit iat in the payload does not help: jsonwebtoken
// deletes payload.iat whenever noTimestamp is truthy. jose adds
// no iat unless `setIssuedAt()` is called or the claims carry one. Options are
// read inline, through a const, a cast and a spread of a const; options from
// a call are not visible.
module require_issued_at {
  type Spelling = Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport | JoseChain
  type Shape =
    | NoOptions | NoTimestampFalse | NoTimestampTrue | ExpiresInOnly
    | NoTimestampRuntime | RuntimeInConst | RuntimeInSpread | RuntimeInCast
    | RuntimeWithPayloadIat | OptionsFromCall
    | JoseNoIat | JoseSetIssuedAt | JoseSeparateSetIssuedAt | JoseClaimsIat

  pure def reports(sp: Spelling, s: Shape): bool =
    sp != NoImport and Set(
      NoTimestampRuntime, RuntimeInConst, RuntimeInSpread, RuntimeInCast,
      RuntimeWithPayloadIat, JoseNoIat,
    ).contains(s)

  var spelling: Spelling
  var shape: Shape
  var verdict: bool

  action step = {
    nondet sp = Set(Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport, JoseChain).oneOf()
    nondet s = (if (sp == JoseChain) Set(JoseNoIat, JoseSetIssuedAt, JoseSeparateSetIssuedAt, JoseClaimsIat) else Set(
      NoOptions, NoTimestampFalse, NoTimestampTrue, ExpiresInOnly,
      NoTimestampRuntime, RuntimeInConst, RuntimeInSpread, RuntimeInCast,
      RuntimeWithPayloadIat, OptionsFromCall,
    )).oneOf()
    all {
      spelling' = sp,
      shape' = s,
      verdict' = reports(sp, s),
    }
  }

  action init = step
}
