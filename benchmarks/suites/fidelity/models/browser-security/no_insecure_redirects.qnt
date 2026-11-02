// Model of eslint-plugin-browser-security/no-insecure-redirects (CWE-601).
// A user-controlled URL written to a navigation sink this rule owns (a write to
// a Location or its .href where the holder resolves to one, location.assign /
// .replace, res.redirect) reports. window.open and router.push belong to
// require-url-validation. Literal targets and targets with a fixed origin are
// not open redirects. Test files are skipped while ignoreInTests (default true).
module no_insecure_redirects {
  type Sink =
    | WindowLocHref
    | LocHref
    | LocAssignEq
    | WindowLocEq
    | TopLocHref
    | WindowBracketLocHref
    | DocLocHref
    | LocAssignCall
    | WindowLocReplace
    | ResRedirect
    | WindowOpen
    | RouterPush
  type Value =
    | UrlParam
    | UrlParamNonNull
    | ReqQuery
    | LocHash
    | TplUserHost
    | TplFixedOrigin
    | LiteralRelative
    | LiteralAllowed

  pure def owned(s: Sink): bool = match s {
    | WindowOpen => false
    | RouterPush => false
    | _ => true
  }

  pure def tainted(v: Value): bool = match v {
    | UrlParam => true
    | UrlParamNonNull => true
    | ReqQuery => true
    | LocHash => true
    | TplUserHost => true
    | TplFixedOrigin => false
    | LiteralRelative => false
    | LiteralAllowed => false
  }

  pure def reports(s: Sink, v: Value, testFile: bool, ignoreInTests: bool, allowOpt: bool): bool =
    if (testFile and ignoreInTests) false
    else owned(s) and tainted(v)

  var sink: Sink
  var value: Value
  var testFile: bool
  var ignoreInTests: bool
  var allowOpt: bool
  var verdict: bool

  action step = {
    nondet s = Set(WindowLocHref, LocHref, LocAssignEq, WindowLocEq, TopLocHref, WindowBracketLocHref, DocLocHref, LocAssignCall, WindowLocReplace, ResRedirect, WindowOpen, RouterPush).oneOf()
    nondet v = Set(UrlParam, UrlParamNonNull, ReqQuery, LocHash, TplUserHost, TplFixedOrigin, LiteralRelative, LiteralAllowed).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet i = Set(true, false).oneOf()
    nondet a = Set(true, false).oneOf()
    all {
      sink' = s, value' = v, testFile' = t, ignoreInTests' = i, allowOpt' = a,
      verdict' = reports(s, v, t, i, a),
    }
  }

  action init = step
}
