// Model of eslint-plugin-express-security/no-missing-csrf-protection (CWE-352).
// DEPRECATED (replacedBy require-csrf-protection) but still exported, so this
// models its documented contract (shared with browser-security's copy): a
// state-changing route (post / put / delete / patch) on an Express app,
// router, or app.route() chain reports unless CSRF middleware is among its
// arguments (csrf(), csurf(), csrfProtection, inside a middleware array, or a
// name from csrfMiddlewarePatterns) or mounted globally with app.use(csrf()).
// GET never reports. protectedMethods narrows the methods; ignorePatterns
// skips matching route paths; csrfMiddlewarePatterns replaces the built-in
// vocabulary. No Express evidence: no report. allowInTests exempts tests.
module no_missing_csrf_protection {
  type Route = AppPost | AppPut | AppDelete | AppPatch | AppGet | RouterPost | ChainPost
  type Mw = NoMw | CsrfCall | CsrfProtectionId | CsurfCall | CustomMw | OtherMw | GlobalCsrf | MwArray
  type Ctx = Default | CustomPat | PostOnly | IgnorePublic | NoExpress | TestDefault | TestFlip

  pure def stateChanging(r: Route, x: Ctx): bool = match r {
    | AppGet => false
    | AppPost => true
    | RouterPost => true
    | ChainPost => true
    | _ => x != PostOnly
  }

  pure def protects(m: Mw, x: Ctx): bool =
    if (x == CustomPat) m == CustomMw
    else match m {
      | NoMw => false
      | OtherMw => false
      | CustomMw => false
      | _ => true
    }

  var route: Route
  var mw: Mw
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet r = Set(AppPost, AppPut, AppDelete, AppPatch, AppGet, RouterPost, ChainPost).oneOf()
    nondet m = Set(NoMw, CsrfCall, CsrfProtectionId, CsurfCall, CustomMw, OtherMw, GlobalCsrf, MwArray).oneOf()
    nondet x = Set(Default, CustomPat, PostOnly, IgnorePublic, NoExpress, TestDefault, TestFlip).oneOf()
    all {
      route' = r, mw' = m, ctx' = x,
      verdict' = (stateChanging(r, x) and not(protects(m, x))
                  and x != IgnorePublic and x != NoExpress and x != TestFlip),
    }
  }

  action init = step
}
