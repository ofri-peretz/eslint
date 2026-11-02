// Model of eslint-plugin-nestjs-security/require-throttler (CWE-770).
// A route handler needs rate limiting (@Throttle / ThrottlerGuard at method or
// class level) unless it opts out with @SkipThrottle, its path is listed in
// skipRoutes, or a global throttler is assumed. With onlySensitiveRoutes
// (default) only unauthenticated credential-adjacent routes (login, …) count.
// The cross-file scan (detectGlobalThrottler) is disabled in the harness.
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

  pure def reports(route: bool, sens: Sensitive, limit: Limit, authed: bool,
                   onlySensitive: bool, assumeGlobal: bool, skipLogin: bool): bool =
    if (not(route)) false
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
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      route' = r, sens' = s, limit' = l, authed' = a,
      onlySensitive' = o, assumeGlobal' = g, skipLogin' = k,
      testCtx' = tc, verdict' = (reports(r, s, l, a, o, g, k) and not(exempt(tc))),
    }
  }

  action init = step
}
