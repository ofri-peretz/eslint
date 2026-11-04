// Model of eslint-plugin-jwt-security/require-algorithm-whitelist (CWE-757).
// Without an explicit algorithm whitelist the token header picks the
// algorithm, which is the substitution attack. Only `algorithms: [...]`
// satisfies it: `algorithm` (singular) is a sign option that every verify API
// ignores, so it pins nothing. jose's JWS verifiers (compactVerify) take
// `algorithms` too, so they are judged like jwtVerify.
// Options are followed within the file: inline, a const, a never-reassigned
// let, a member of an object literal, a cast, a spread of a const, the single
// return of a same-file function. Options from a parameter, a call or a spread
// of a call may carry it, so the rule stays silent on them; so it does on a
// NestJS JwtService call, whose options merge over JwtModule's in another file.
module require_algorithm_whitelist {
  type Verifier =
    | Default | Namespace | Require | Named | Renamed | RequireDestructured | Bracket | NoImport
    | Jose | JoseCompact | NestService
  type Shape =
    | NoOpts | EmptyObj | OtherOnly | Inline | AltSpelling
    | ConstWith | ConstWithout | SpreadConstWith | SpreadConstWithout | CastWith
    | LetWith | MemberWith | ReturnWith | ReturnWithout
    | ParamOpts | CallOpts | SpreadCall

  pure def carries(s: Shape): bool =
    Set(Inline, AltSpelling, ConstWith, SpreadConstWith, CastWith, LetWith, MemberWith, ReturnWith).contains(s)
  pure def opaque(s: Shape): bool = Set(ParamOpts, CallOpts, SpreadCall).contains(s)
  pure def judged(v: Verifier): bool = v != NoImport and v != NestService

  pure def reports(v: Verifier, s: Shape): bool =
    judged(v) and not(carries(s)) and not(opaque(s))

  var verifier: Verifier
  var shape: Shape
  var verdict: bool

  action step = {
    nondet v = Set(
      Default, Namespace, Require, Named, Renamed, RequireDestructured, Bracket, NoImport,
      Jose, JoseCompact, NestService,
    ).oneOf()
    nondet s = Set(
      NoOpts, EmptyObj, OtherOnly, Inline, AltSpelling,
      ConstWith, ConstWithout, SpreadConstWith, SpreadConstWithout, CastWith,
      LetWith, MemberWith, ReturnWith, ReturnWithout,
      ParamOpts, CallOpts, SpreadCall,
    ).oneOf()
    all {
      verifier' = v,
      shape' = s,
      verdict' = reports(v, s),
    }
  }

  action init = step
}
