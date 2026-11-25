// Model of eslint-plugin-express-security/require-csrf-protection (CWE-352).
// A state-changing route (protectedMethods, default post/put/patch/delete) is
// reported when it has no CSRF token middleware AND both documented
// preconditions hold: the file carries a credential the browser attaches on
// its own, and the route is authenticated (auth middleware in its chain, a
// router-wide use(requireAuth), or a handler that reads req.user). A session
// store (express-session) is such a credential. cookie-parser alone is not:
// it parses whatever a cookie holds, so it counts only when a handler also
// reads req.cookies (CookieRead). Two route shapes carry no cross-site
// authority and stay quiet whatever the file mounts: a guard-only registration
// (app.post('/x', requireAuth()) handles nothing) and a bearer route
// (passport.authenticate('jwt', { session: false }), which reads the
// Authorization header a browser does not attach) - unless the handler also
// reads a cookie, which makes the cookie the credential that counts. CSRF middleware mounted globally,
// per-route, or inside a middleware array protects it. So does lusca: a
// global wrapper that builds lusca.csrf() and hands it the request and its own
// next (LuscaWrapper), or lusca({ csrf: true }) in the route chain (LuscaRoute).
// lusca({ csrf: false }) mounted globally turns CSRF off (LuscaOff). Loading
// lusca, like csurf, is itself credential evidence: a CSRF library means a
// cookie session, so LuscaOff reports even with no other credential. ignorePatterns
// silences a matching route path. Options: protectedMethods ['post'] narrows
// the methods (PostOnly); ignorePatterns ['/transfer'] (IgnoreMatch) or
// ['/api/webhook'] (IgnoreOther, does not match). Spellings: app = express(),
// express.Router(), a chained app.route('/transfer'), and a require()d app.
module require_csrf_protection {
  type TestCtx = Prod | TestDefault | TestFlip
  // allowInTests defaults to false: a test file is exempt only when flipped.
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Cred = Session | CookieParser | CookieRead | NoCred
  type Auth = RouteMw | GlobalAuth | ReadsUser | NoAuth
  type Csrf = NoCsrf | GlobalCsrf | RouteCsrf | ArrayCsrf | LuscaWrapper | LuscaRoute | LuscaOff
  type Method = Post | Put | Patch | Delete | Get
  type Spelling = App | Router | RouteChain | RequireApp
  type Opts = Default | PostOnly | IgnoreMatch | IgnoreOther
  type Shape = Normal | GuardOnly | Bearer

  pure def protectedMethod(m: Method, o: Opts): bool =
    if (o == PostOnly) m == Post else m != Get

  // cookie-parser mounted alone shows no credential; a handler that reads
  // req.cookies does.
  pure def ambient(c: Cred): bool = c == Session or c == CookieRead

  // Bearer exempts unless the handler reads a cookie (CookieRead).
  pure def exemptShape(sh: Shape, c: Cred): bool =
    sh == GuardOnly or (sh == Bearer and c != CookieRead)

  pure def reports(c: Cred, a: Auth, x: Csrf, m: Method, sp: Spelling, o: Opts, sh: Shape): bool =
    (ambient(c) or x == LuscaOff) and a != NoAuth and (x == NoCsrf or x == LuscaOff) and protectedMethod(m, o) and o != IgnoreMatch
      and not(exemptShape(sh, c))

  // The credential x auth x csrf core is crossed at app/post/default options;
  // every other spelling/method/option with a session app, two auth shapes
  // and no or route-level CSRF.
  pure val CORE = tuples(Set(Session, CookieParser, CookieRead, NoCred), Set(RouteMw, GlobalAuth, ReadsUser, NoAuth),
                         Set(NoCsrf, GlobalCsrf, RouteCsrf, ArrayCsrf, LuscaWrapper, LuscaRoute, LuscaOff), Set(Post), Set(App), Set(Default), Set(Normal))
  pure val REST = tuples(Set(Session), Set(RouteMw, GlobalAuth), Set(NoCsrf, RouteCsrf),
                         Set(Post, Put, Patch, Delete, Get), Set(App, Router, RouteChain, RequireApp),
                         Set(Default, PostOnly, IgnoreMatch, IgnoreOther), Set(Normal))
  // Guard-only (one auth shape: the guard IS the registration) and bearer
  // registrations, crossed with every credential at app/post/default/no CSRF.
  pure val SHAPES = tuples(Set(Session, CookieParser, CookieRead, NoCred), Set(RouteMw),
                           Set(NoCsrf), Set(Post), Set(App), Set(Default), Set(GuardOnly))
                    .union(tuples(Set(Session, CookieParser, CookieRead, NoCred), Set(RouteMw, GlobalAuth, ReadsUser),
                           Set(NoCsrf), Set(Post), Set(App), Set(Default), Set(Bearer)))

  var cred: Cred
  var auth: Auth
  var csrf: Csrf
  var method: Method
  var spelling: Spelling
  var opts: Opts
  var shape: Shape
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = CORE.union(REST).union(SHAPES).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      cred' = i._1, auth' = i._2, csrf' = i._3, method' = i._4, spelling' = i._5, opts' = i._6, shape' = i._7,
      testCtx' = tc,
      verdict' = (reports(i._1, i._2, i._3, i._4, i._5, i._6, i._7) and not(exempt(tc))),
    }
  }

  action init = step
}
