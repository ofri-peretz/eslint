// Model of eslint-plugin-browser-security/no-missing-cors-check (CWE-346).
// DEPRECATED (replacedBy express-security/no-permissive-cors) but still
// exported and still documented as active, so this models the documented
// contract: a wildcard origin (cors({ origin: '*' }), an
// Access-Control-Allow-Origin: * header in any header-name case or setter),
// and CORS middleware without origin validation (no origin option, cors(),
// origin: true which reflects every origin, or reflecting req.headers.origin
// unchecked) report. An array, a validating function, a fixed origin, or a
// header set inside an allowlist check do not. trustedLibraries silences the
// wildcard-origin finding for that library ('*', and origin: true which is a
// wildcard by reflection). Test files report unless
// allowInTests.
module no_missing_cors_check {
  type Cfg =
    | CorsWildcard
    | CorsNoOrigin
    | CorsNoArgs
    | CorsOriginTrue
    | CorsOriginArray
    | CorsOriginFn
    | CorsOriginLiteral
    | HeaderWildcard
    | HeaderWildcardLower
    | ResHeaderWildcard
    | HeaderReflectUnchecked
    | HeaderValidated

  pure def reports(c: Cfg, testFile: bool, allowInTests: bool, trusted: bool): bool =
    if (testFile and allowInTests) false
    else match c {
      | CorsWildcard => not(trusted)
      | CorsNoOrigin => true
      | CorsNoArgs => true
      | CorsOriginTrue => not(trusted)
      | HeaderWildcard => true
      | HeaderWildcardLower => true
      | ResHeaderWildcard => true
      | HeaderReflectUnchecked => true
      | _ => false
    }

  var cfg: Cfg
  var testFile: bool
  var allowInTests: bool
  var trusted: bool
  var verdict: bool

  action step = {
    nondet c = Set(CorsWildcard, CorsNoOrigin, CorsNoArgs, CorsOriginTrue, CorsOriginArray, CorsOriginFn, CorsOriginLiteral, HeaderWildcard, HeaderWildcardLower, ResHeaderWildcard, HeaderReflectUnchecked, HeaderValidated).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet r = Set(true, false).oneOf()
    all { cfg' = c, testFile' = t, allowInTests' = a, trusted' = r, verdict' = reports(c, t, a, r) }
  }

  action init = step
}
