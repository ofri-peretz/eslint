// Model of eslint-plugin-secure-coding/no-missing-authentication (CWE-287).
// Contract: a route registration (`get`/`post`/...) on an HTTP application or
// router (express(), express.Router(), fastify()) whose middleware chain holds no
// recognised authentication middleware is reported, unless its path is public by
// definition (login, health, ...). authenticate(), passport.authenticate(...)
// and a bare `requireAuth` reference are auth middleware; a rate limiter is not.
// A `.get(path, fn)` on an object that is not a router (a Map) is not a route.
module no_missing_authentication {
  type Router = App | ExpressRouter | Fastify | NotRouter
  type Method = Get | Post
  type Auth = NoAuth | AuthenticateCall | PassportAuth | RequireAuthRef | RateLimitOnly
  type Path = Private | Login | Health

  pure def reports(r: Router, a: Auth, p: Path): bool =
    r != NotRouter and Set(NoAuth, RateLimitOnly).contains(a) and p == Private

  var router: Router
  var method: Method
  var auth: Auth
  var path: Path
  var verdict: bool

  action step = {
    nondet r = Set(App, ExpressRouter, Fastify, NotRouter).oneOf()
    nondet m = Set(Get, Post).oneOf()
    nondet a = Set(NoAuth, AuthenticateCall, PassportAuth, RequireAuthRef, RateLimitOnly).oneOf()
    nondet p = Set(Private, Login, Health).oneOf()
    all { router' = r, method' = m, auth' = a, path' = p, verdict' = reports(r, a, p) }
  }

  action init = step
}
