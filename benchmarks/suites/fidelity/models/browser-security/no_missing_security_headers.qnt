// Model of eslint-plugin-browser-security/no-missing-security-headers (CWE-693).
// DEPRECATED (replacedBy express-security/require-helmet) but still exported;
// its doc is a stub, so the contract is the options table plus the rule's
// stated partition: a scope that explicitly SETS response headers and omits
// one of requiredHeaders (default CSP, X-Frame-Options,
// X-Content-Type-Options) reports. A scope setting no header at all, or only
// transport/caching headers (Cache-Control), is not serving a document here.
// Header names are case-insensitive and any Express setter spelling counts.
// Test files are skipped while ignoreInTests (default true).
module no_missing_security_headers {
  type Extra = NoExtra | ContentType | CacheControl
  type Spelling = SetHeaderCanon | SetHeaderLower | ResSetCanon | ResHeaderCanon

  pure def reports(csp: bool, xfo: bool, xcto: bool, extra: Extra, sp: Spelling,
                   customXfoOnly: bool, testFile: bool): bool =
    if (testFile) false
    else {
      val setsDocHeader = csp or xfo or xcto or extra == ContentType
      val missing = if (customXfoOnly) not(xfo) else not(csp and xfo and xcto)
      setsDocHeader and missing
    }

  var csp: bool
  var xfo: bool
  var xcto: bool
  var extra: Extra
  var spelling: Spelling
  var customXfoOnly: bool
  var testFile: bool
  var verdict: bool

  action step = {
    nondet a = Set(true, false).oneOf()
    nondet b = Set(true, false).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet e = Set(NoExtra, ContentType, CacheControl).oneOf()
    nondet sp = Set(SetHeaderCanon, SetHeaderLower, ResSetCanon, ResHeaderCanon).oneOf()
    nondet o = Set(true, false).oneOf()
    nondet t = Set(true, false).oneOf()
    all {
      csp' = a, xfo' = b, xcto' = c, extra' = e, spelling' = sp, customXfoOnly' = o, testFile' = t,
      verdict' = reports(a, b, c, e, sp, o, t),
    }
  }

  action init = step
}
