// Model of eslint-plugin-browser-security/no-missing-csrf-protection (CWE-352).
// DEPRECATED (replacedBy express-security/require-csrf-protection) but still
// exported and documented as active, so this models the documented contract:
// a state-changing route (post / put / delete / patch, on app or router)
// reports unless CSRF middleware is in its arguments (csrf(), csurf(),
// csrfProtection, or a name from csrfMiddlewarePatterns) or applied globally
// with app.use(csrf()). GET never reports. protectedMethods narrows which
// methods require protection. Test files report unless allowInTests.
module no_missing_csrf_protection {
  type Route = Post | Put | Delete | Patch | Get | RouterPost
  type Mw = NoMw | CsrfCall | CsrfProtectionId | CsurfCall | CustomMw | OtherMw | GlobalCsrf

  pure def stateChanging(r: Route, postOnly: bool): bool = match r {
    | Get => false
    | Post => true
    | RouterPost => true
    | _ => not(postOnly)
  }

  // csrfMiddlewarePatterns REPLACES the built-in vocabulary (the doc's example
  // config restates "csrf" alongside its custom name), so with ['antiForgery']
  // configured only antiForgery protects.
  pure def protects(m: Mw, customOpt: bool): bool =
    if (customOpt) m == CustomMw
    else match m {
      | NoMw => false
      | OtherMw => false
      | CustomMw => false
      | _ => true
    }

  pure def reports(r: Route, m: Mw, customOpt: bool, postOnly: bool, testFile: bool, allowInTests: bool): bool =
    if (testFile and allowInTests) false
    else stateChanging(r, postOnly) and not(protects(m, customOpt))

  var route: Route
  var mw: Mw
  var customOpt: bool
  var postOnly: bool
  var testFile: bool
  var allowInTests: bool
  var verdict: bool

  action step = {
    nondet r = Set(Post, Put, Delete, Patch, Get, RouterPost).oneOf()
    nondet m = Set(NoMw, CsrfCall, CsrfProtectionId, CsurfCall, CustomMw, OtherMw, GlobalCsrf).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet p = Set(true, false).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet a = Set(true, false).oneOf()
    all {
      route' = r, mw' = m, customOpt' = c, postOnly' = p, testFile' = t, allowInTests' = a,
      verdict' = reports(r, m, c, p, t, a),
    }
  }

  action init = step
}
