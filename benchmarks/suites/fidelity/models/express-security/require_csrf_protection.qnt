// Model of eslint-plugin-express-security/require-csrf-protection (CWE-352).
// A state-changing route (protectedMethods, default post/put/patch/delete) is
// reported when it has no CSRF token middleware AND both documented
// preconditions hold: the file carries ambient credential material (an
// express-session / cookie-parser import and mount), and the route is
// authenticated (auth middleware in its chain, a router-wide use(requireAuth),
// or a handler that reads req.user). CSRF middleware mounted globally,
// per-route, or inside a middleware array protects it. ignorePatterns
// silences a matching route path. Options: protectedMethods ['post'] narrows
// the methods (PostOnly); ignorePatterns ['/transfer'] (IgnoreMatch) or
// ['/api/webhook'] (IgnoreOther, does not match). Spellings: app = express(),
// express.Router(), a chained app.route('/transfer'), and a require()d app.
module require_csrf_protection {
  type TestCtx = Prod | TestDefault | TestFlip
  // allowInTests defaults to false: a test file is exempt only when flipped.
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Cred = Session | CookieParser | NoCred
  type Auth = RouteMw | GlobalAuth | ReadsUser | NoAuth
  type Csrf = NoCsrf | GlobalCsrf | RouteCsrf | ArrayCsrf
  type Method = Post | Put | Patch | Delete | Get
  type Spelling = App | Router | RouteChain | RequireApp
  type Opts = Default | PostOnly | IgnoreMatch | IgnoreOther

  pure def protectedMethod(m: Method, o: Opts): bool =
    if (o == PostOnly) m == Post else m != Get

  pure def reports(c: Cred, a: Auth, x: Csrf, m: Method, sp: Spelling, o: Opts): bool =
    c != NoCred and a != NoAuth and x == NoCsrf and protectedMethod(m, o) and o != IgnoreMatch

  // The credential x auth x csrf core is crossed at app/post/default options;
  // every other spelling/method/option with a session app, two auth shapes
  // and no or route-level CSRF.
  pure val CORE = tuples(Set(Session, CookieParser, NoCred), Set(RouteMw, GlobalAuth, ReadsUser, NoAuth),
                         Set(NoCsrf, GlobalCsrf, RouteCsrf, ArrayCsrf), Set(Post), Set(App), Set(Default))
  pure val REST = tuples(Set(Session), Set(RouteMw, GlobalAuth), Set(NoCsrf, RouteCsrf),
                         Set(Post, Put, Patch, Delete, Get), Set(App, Router, RouteChain, RequireApp),
                         Set(Default, PostOnly, IgnoreMatch, IgnoreOther))

  var cred: Cred
  var auth: Auth
  var csrf: Csrf
  var method: Method
  var spelling: Spelling
  var opts: Opts
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = CORE.union(REST).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      cred' = i._1, auth' = i._2, csrf' = i._3, method' = i._4, spelling' = i._5, opts' = i._6,
      testCtx' = tc,
      verdict' = (reports(i._1, i._2, i._3, i._4, i._5, i._6) and not(exempt(tc))),
    }
  }

  action init = step
}
