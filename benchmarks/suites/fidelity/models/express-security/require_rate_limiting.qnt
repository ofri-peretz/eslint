// Model of eslint-plugin-express-security/require-rate-limiting (CWE-770).
// Reported: a state-changing route (POST/PUT, plain or through app.route())
// whose path names a secret to be checked (login, token, password reset, OTP,
// invite redemption) when no rate limiter is anywhere in the file. A GET, or a
// state-changing route that is no credential surface, is never reported.
// A limiter counts however it is bound: app.use(rateLimit(…)), a limiter
// variable, route-level, a renamed default import or require of
// express-rate-limit, inside a middleware array; an `alternativeMiddleware`
// name only when configured. The rule abstains when the app leaves the file
// (module.exports, passed to a configurer) and under assumeRateLimiting.
// Receivers are recognised by name: `appReceiverNames` REPLACES the default
// list (app, server, router, express, api, apiRouter, routes).
module require_rate_limiting {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to
  // false, so a test file is exempt only when the option is turned on.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Path = Login | Token | PasswordReset | Otp | InviteRedeem | Articles
  type Verb = Post | Put | Get
  type Recv =
    | App | Router | Api
    | Gateway          // const gateway = express(): not a default name
    | GatewayNamed     // appReceiverNames: ['gateway']
    | AppNotNamed      // appReceiverNames: ['gateway'], receiver app
  type Spelling = Direct | RouteChain
  type Limiter =
    | NoLimiter
    | GlobalUse        // app.use(rateLimit({ … }))
    | LimiterVar       // const limiter = rateLimit(…); app.use(limiter)
    | RouteLevel       // app.post('/login', loginLimiter, h)
    | RenamedImport    // import throttle from 'express-rate-limit'; app.use(throttle(…))
    | RequireImport    // const rateLimit = require('express-rate-limit')
    | InArray          // app.use([express.json(), rateLimit(…)])
    | AltNamed         // app.use(bruteGuard()) with alternativeMiddleware: ['bruteGuard']
    | AltUnnamed       // app.use(bruteGuard()), option not set
  type Escape = Stays | CjsExport | Configure

  pure def secretPath(p: Path): bool = p != Articles
  pure def receiverSeen(r: Recv): bool = not(r == Gateway or r == AppNotNamed)
  pure def limited(l: Limiter): bool = l != NoLimiter and l != AltUnnamed

  pure def reports(p: Path, v: Verb, r: Recv, l: Limiter, x: Escape, assumeRl: bool): bool =
    secretPath(p) and v != Get and receiverSeen(r) and not(limited(l))
      and x == Stays and not(assumeRl)

  // Three overlapping slices, each sampled uniformly: every path x verb;
  // receivers x spellings on POST /login and POST /articles; limiters x
  // escapes x assume on the plain POST /login.
  type Slice = Surface | Receivers | Limiters

  var path: Path
  var verb: Verb
  var recv: Recv
  var spelling: Spelling
  var limiter: Limiter
  var escape: Escape
  var assumeRl: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet g = Set(Surface, Receivers, Limiters).oneOf()
    nondet p = (if (g == Surface) Set(Login, Token, PasswordReset, Otp, InviteRedeem, Articles)
                else if (g == Receivers) Set(Login, Articles) else Set(Login)).oneOf()
    nondet v = (if (g == Surface) Set(Post, Put, Get) else Set(Post)).oneOf()
    nondet r = (if (g == Receivers) Set(App, Router, Api, Gateway, GatewayNamed, AppNotNamed) else Set(App)).oneOf()
    nondet s = (if (g == Receivers) Set(Direct, RouteChain) else Set(Direct)).oneOf()
    nondet l = (if (g == Limiters)
                  Set(NoLimiter, GlobalUse, LimiterVar, RouteLevel, RenamedImport, RequireImport,
                      InArray, AltNamed, AltUnnamed)
                else Set(NoLimiter)).oneOf()
    nondet x = (if (g == Limiters) Set(Stays, CjsExport, Configure) else Set(Stays)).oneOf()
    nondet a = (if (g == Limiters) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      path' = p, verb' = v, recv' = r, spelling' = s, limiter' = l, escape' = x,
      assumeRl' = a, testCtx' = tc,
      verdict' = (reports(p, v, r, l, x, a) and not(exempt(tc))),
    }
  }

  action init = step
}
