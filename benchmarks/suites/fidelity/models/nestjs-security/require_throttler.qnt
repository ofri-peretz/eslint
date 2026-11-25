// Model of eslint-plugin-nestjs-security/require-throttler (CWE-770).
// A route handler needs rate limiting (@Throttle / ThrottlerGuard at method or
// class level) unless it opts out with @SkipThrottle, its path is listed in
// skipRoutes, or a global throttler is assumed. With onlySensitiveRoutes
// (default) only unauthenticated credential-adjacent routes (login, …) count.
// With detectGlobalThrottler the project is read too: a ThrottlerGuard, or a
// class extending it, bound app-wide (APP_GUARD or APP_INTERCEPTOR) throttles
// every route. Importing ThrottlerModule binds nothing and throttles nothing.
module require_throttler {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  // Where the credential-adjacent word "login" appears.
  type Sensitive = InPath | InMethodName | NotSensitive
  type Limit =
    | NoLimit
    | ThrottleMethod     // @Throttle({...}) on the handler
    | ThrottleClass      // @Throttle({...}) on the controller
    | GuardMethod        // @UseGuards(ThrottlerGuard) on the handler
    | GuardClass         // @UseGuards(ThrottlerGuard) on the controller
    | SkipThrottle       // @SkipThrottle() — deliberate opt-out

  // What the project registers, when the rule is allowed to look (NoScan: it is not).
  type Project =
    | NoScan
    | Unbound            // no ThrottlerModule, no guard
    | ModuleOnly         // ThrottlerModule.forRoot([...]) and nothing bound
    | GuardBound         // { provide: APP_GUARD, useClass: ThrottlerGuard }
    | SubclassBound      // APP_GUARD → a subclass in another file, named without "Throttler"
    | InterceptorBound   // APP_INTERCEPTOR → a subclass of ThrottlerGuard

  pure def bound(p: Project): bool =
    p == GuardBound or p == SubclassBound or p == InterceptorBound

  pure def reports(route: bool, sens: Sensitive, limit: Limit, authed: bool,
                   onlySensitive: bool, assumeGlobal: bool, skipLogin: bool, p: Project): bool =
    if (not(route)) false
    else if (bound(p)) false
    else if (limit != NoLimit) false
    else if (assumeGlobal) false
    else if (skipLogin and sens == InPath) false
    else if (onlySensitive) sens != NotSensitive and not(authed)
    else true

  var route: bool
  var sens: Sensitive
  var limit: Limit
  var authed: bool
  var onlySensitive: bool
  var assumeGlobal: bool
  var skipLogin: bool
  var project: Project
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    // A method that is not a route is never reported: sampled once.
    nondet r = Set(true, false).oneOf()
    nondet s = (if (r) Set(InPath, InMethodName, NotSensitive) else Set(NotSensitive)).oneOf()
    nondet l = (if (r) Set(NoLimit, ThrottleMethod, ThrottleClass, GuardMethod, GuardClass, SkipThrottle)
                else Set(NoLimit)).oneOf()
    nondet a = (if (r) Set(true, false) else Set(false)).oneOf()
    nondet o = (if (r) Set(true, false) else Set(false)).oneOf()
    nondet g = (if (r) Set(true, false) else Set(false)).oneOf()
    nondet k = (if (r) Set(true, false) else Set(false)).oneOf()
    // The project is read on one input: an unthrottled public login route.
    val scanned = r and s == InPath and l == NoLimit and not(a) and o and not(g) and not(k)
    nondet p = (if (scanned) Set(NoScan, Unbound, ModuleOnly, GuardBound, SubclassBound, InterceptorBound)
                else Set(NoScan)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      route' = r, sens' = s, limit' = l, authed' = a,
      onlySensitive' = o, assumeGlobal' = g, skipLogin' = k, project' = p,
      testCtx' = tc, verdict' = (reports(r, s, l, a, o, g, k, p) and not(exempt(tc))),
    }
  }

  action init = step
}
