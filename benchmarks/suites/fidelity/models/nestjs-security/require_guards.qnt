// Model of eslint-plugin-nestjs-security/require-guards (CWE-306).
// Single-file view: the cross-file APP_GUARD scan is disabled in the harness.
module require_guards {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type GuardState = Absent | Empty | Named

  pure def reports(isController: bool, isRouteHandler: bool, classPublic: bool,
                   methodPublic: bool, authDeco: bool, publicByDesign: bool,
                   guards: GuardState, requiredConfigured: bool, requiredMatch: bool): bool =
    if (not(isController) or not(isRouteHandler)) false
    else if (classPublic or methodPublic or authDeco or publicByDesign) false
    else match guards {
      | Absent => true
      | Empty => true
      | Named => requiredConfigured and not(requiredMatch)
    }

  var isController: bool
  var isRouteHandler: bool
  var classPublic: bool
  var methodPublic: bool
  var authDeco: bool
  var publicByDesign: bool
  var guards: GuardState
  var requiredConfigured: bool
  var requiredMatch: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet a = Set(true, false).oneOf()
    nondet b = Set(true, false).oneOf()
    // Outside a controller route nothing is reported: each such pair is
    // sampled once rather than crossed with every decorator combination.
    val inRoute = a and b
    nondet c = (if (inRoute) Set(true, false) else Set(false)).oneOf()
    nondet d = (if (inRoute) Set(true, false) else Set(false)).oneOf()
    nondet e = (if (inRoute) Set(true, false) else Set(false)).oneOf()
    nondet f = (if (inRoute) Set(true, false) else Set(false)).oneOf()
    nondet g = (if (inRoute) Set(Absent, Empty, Named) else Set(Absent)).oneOf()
    nondet h = (if (inRoute) Set(true, false) else Set(false)).oneOf()
    nondet i = (if (inRoute) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      isController' = a,
      isRouteHandler' = b,
      classPublic' = c,
      methodPublic' = d,
      authDeco' = e,
      publicByDesign' = f,
      guards' = g,
      requiredConfigured' = h,
      requiredMatch' = i,
      testCtx' = tc, verdict' = (reports(a, b, c, d, e, f, g, h, i) and not(exempt(tc))),
    }
  }

  action init = step
}
