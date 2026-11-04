// Model of eslint-plugin-express-security/no-missing-cors-check (CWE-346).
// Deprecated in favour of no-permissive-cors, whose detection surface it
// shares, and per its doc "receives no new detection work". Its contract is
// the wildcard: `cors({ origin: '*' })` and the response header
// `Access-Control-Allow-Origin: *` written with res.setHeader / res.header.
// Safe: an explicit list, a fixed string, a validating callback, a header set
// to a fixed origin or to the request origin inside an allowlist check.
// trustedLibraries: ['cors'] trusts that library, so its calls are not
// reported; ignorePatterns: ['\\*'] accepts the wildcard in a cors() call.
// (The header finding is matched against the callee text `res.setHeader`, so
// a value pattern does not silence it: undocumented, kept as the rule does.)
// Narrowed (judgment, deprecated rule): cors() with no options, origin: true,
// res.set(ACAO, '*') and the reflected request Origin are sampled as safe here;
// no-permissive-cors (the replacement) owns the first two.
// No Express evidence in the file: no report.
module no_missing_cors_check {
  type Sink =
    | CorsNoArg | CorsStar | CorsTrue
    | CorsList | CorsString | CorsCallback
    | HdrSetHeaderStar | HdrHeaderStar | HdrSetStar
    | HdrReflect | HdrValidated | HdrFixed
  type Ctx =
    | DefImport | DefRequire | DefRouter | DefNoExpress
    | DefTestFile | FlipTestFile
    | CfgTrustCors       // trustedLibraries: ['cors']
    | CfgIgnoreStar      // ignorePatterns: ['\\*']

  pure def isCors(s: Sink): bool =
    s == CorsNoArg or s == CorsStar or s == CorsTrue or s == CorsList or s == CorsString or s == CorsCallback

  pure def unsafe(s: Sink): bool =
    s == CorsStar or s == HdrSetHeaderStar or s == HdrHeaderStar

  pure def silenced(s: Sink, x: Ctx): bool =
    x == DefNoExpress or x == FlipTestFile
      or (x == CfgTrustCors and isCors(s))
      or (x == CfgIgnoreStar and isCors(s))

  var sink: Sink
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet s = Set(CorsNoArg, CorsStar, CorsTrue, CorsList, CorsString, CorsCallback,
                   HdrSetHeaderStar, HdrHeaderStar, HdrSetStar, HdrReflect, HdrValidated, HdrFixed).oneOf()
    nondet x = Set(DefImport, DefRequire, DefRouter, DefNoExpress, DefTestFile, FlipTestFile,
                   CfgTrustCors, CfgIgnoreStar).oneOf()
    all { sink' = s, ctx' = x, verdict' = (unsafe(s) and not(silenced(s, x))) }
  }

  action init = step
}
