// Model of eslint-plugin-nestjs-security/require-guards (CWE-306).
// Single-file view: the cross-file APP_GUARD scan is disabled in the harness.
module require_guards {
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
  var verdict: bool

  action step = {
    nondet a = Set(true, false).oneOf()
    nondet b = Set(true, false).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet d = Set(true, false).oneOf()
    nondet e = Set(true, false).oneOf()
    nondet f = Set(true, false).oneOf()
    nondet g = Set(Absent, Empty, Named).oneOf()
    nondet h = Set(true, false).oneOf()
    nondet i = Set(true, false).oneOf()
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
      verdict' = reports(a, b, c, d, e, f, g, h, i),
    }
  }

  action init = step
}
