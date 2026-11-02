// Model of eslint-plugin-browser-security/no-incomplete-url-sanitization (CWE-20).
// (1) A substring test (includes / indexOf / lastIndexOf against -1) of a host
//     needle, on a value proven to be a URL (a URL-named binding, or a
//     location read), reports.
// (2) A scheme denylist that rejects javascript: but not data: reports.
module no_incomplete_url_sanitization {
  type Check =
    | Includes
    | ComputedIncludes
    | IndexOfNeq
    | IndexOfGe
    | LastIndexOfNeq
    | LastIndexOfSuffix
    | IncludesNonHost
    | HostEq
    | SchemeOnlyJs
    | SchemeComplete
    | SchemeAllowlist
  type Recv = UrlName | HostName | Opaque | Target | LocationHref

  // urlNameWords option set to ['target'] REPLACES the default vocabulary.
  pure def urlish(r: Recv, custom: bool): bool = match r {
    | UrlName => not(custom)
    | HostName => not(custom)
    | Opaque => false
    | Target => custom
    | LocationHref => true
  }

  pure def reports(c: Check, r: Recv, custom: bool): bool = match c {
    | Includes => urlish(r, custom)
    | ComputedIncludes => urlish(r, custom)
    | IndexOfNeq => urlish(r, custom)
    | IndexOfGe => urlish(r, custom)
    | LastIndexOfNeq => urlish(r, custom)
    | LastIndexOfSuffix => false
    | IncludesNonHost => false
    | HostEq => false
    | SchemeOnlyJs => true
    | SchemeComplete => false
    | SchemeAllowlist => false
  }

  var check: Check
  var recv: Recv
  var custom: bool
  var verdict: bool

  action step = {
    nondet c = Set(Includes, ComputedIncludes, IndexOfNeq, IndexOfGe, LastIndexOfNeq, LastIndexOfSuffix, IncludesNonHost, HostEq, SchemeOnlyJs, SchemeComplete, SchemeAllowlist).oneOf()
    nondet r = Set(UrlName, HostName, Opaque, Target, LocationHref).oneOf()
    nondet o = Set(true, false).oneOf()
    all { check' = c, recv' = r, custom' = o, verdict' = reports(c, r, o) }
  }

  action init = step
}
