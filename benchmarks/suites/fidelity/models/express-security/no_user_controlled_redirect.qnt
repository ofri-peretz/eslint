// Model of eslint-plugin-express-security/no-user-controlled-redirect (CWE-601).
// A redirect whose target is a request-controlled value (req.query, req.body,
// req.params) is an open redirect. A literal target, a target looked up in an
// allowlist, or a target whose own value was validated first is safe;
// validating a DIFFERENT key does not count. Express's `res.redirect(status,
// url)` form is the same sink. The request/response objects are recognised by
// name: req/res and request/response by default; other names (q/r) only once
// listed in requestObjects/responseObjects (Extra = ['q'] / ['r']), which add
// to the defaults. No Express: no report.
// Narrowed (judgment call): the rule matches the redirect argument directly
// and does no data flow, so a target copied into a local first
// (`const { returnTo } = req.query`) is not modelled as reported.
module no_user_controlled_redirect {
  type Target =
    | QueryDot       // res.redirect(req.query.returnTo)
    | QueryBracket   // res.redirect(req.query['returnTo'])
    | Body           // res.redirect(req.body.next)
    | Params         // res.redirect(req.params.target)
    | StatusQuery    // res.redirect(302, req.query.returnTo)
    | Literal        // res.redirect('/dashboard')
    | StatusLiteral  // res.redirect(301, '/login')
    | AllowMap       // res.redirect(ALLOWED.get(req.query.to) ?? '/')
    | SameGuard      // host of req.query.a checked, then req.query.a redirected
    | OtherGuard     // host of req.query.a checked, then req.query.b redirected
  type Names = ReqRes | RequestResponse | Short
  type Mount = App | Router | RequireApp | NoExpress
  type Opts = Default | Extra

  pure def unsafe(t: Target): bool =
    t == QueryDot or t == QueryBracket or t == Body or t == Params or t == StatusQuery
      or t == OtherGuard

  var target: Target
  var names: Names
  var mount: Mount
  var opts: Opts
  var verdict: bool

  action step = {
    nondet t = Set(QueryDot, QueryBracket, Body, Params, StatusQuery, Literal, StatusLiteral,
                   AllowMap, SameGuard, OtherGuard).oneOf()
    nondet n = Set(ReqRes, RequestResponse, Short).oneOf()
    nondet m = Set(App, Router, RequireApp, NoExpress).oneOf()
    nondet o = Set(Default, Extra).oneOf()
    all { target' = t, names' = n, mount' = m, opts' = o,
          verdict' = (unsafe(t) and m != NoExpress and (n != Short or o == Extra)) }
  }

  action init = step
}
