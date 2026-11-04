// Model of eslint-plugin-express-security/no-express-unsafe-regex-route (CWE-1333).
// A regex literal used as an Express route path is reported when it can
// backtrack catastrophically: a quantified group whose body is itself
// quantified ((a+)+, (.*)*, ([a-zA-Z]+)*, (\w*)+) or an overlapping
// alternation under a quantifier ((a|aa)+). Linear patterns, a bounded `?`
// over a quantified group, and string paths are safe. Any registration
// spelling counts, including app.route(re) and an array of paths.
// `allowInTests` (default false) exempts test files only when turned on.
module no_express_unsafe_regex_route {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Pattern = NestedPlus | DotStarStar | ClassPlusStar | WordStarPlus | AltOverlap
               | SafeClass | SafeWord | SafeGroupPlus | SafeOptionalGroup | StringPath
  type Reg = AppGet | RouterGet | AppUse | RouteChain | RouterAll | PathArray | NamedRouter

  pure def unsafe(p: Pattern): bool =
    p == NestedPlus or p == DotStarStar or p == ClassPlusStar or p == WordStarPlus or p == AltOverlap

  var pattern: Pattern
  var reg: Reg
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet p = Set(NestedPlus, DotStarStar, ClassPlusStar, WordStarPlus, AltOverlap,
                   SafeClass, SafeWord, SafeGroupPlus, SafeOptionalGroup, StringPath).oneOf()
    nondet r = (if (p == NestedPlus or p == SafeClass)
                  Set(AppGet, RouterGet, AppUse, RouteChain, RouterAll, PathArray, NamedRouter)
                else Set(AppGet)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { pattern' = p, reg' = r, testCtx' = tc, verdict' = (unsafe(p) and not(exempt(tc))) }
  }

  action init = step
}
