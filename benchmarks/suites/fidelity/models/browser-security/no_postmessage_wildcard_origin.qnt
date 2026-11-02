// Model of eslint-plugin-browser-security/no-postmessage-wildcard-origin (CWE-346).
// Contract: a postMessage call whose targetOrigin is "*" (positional or in the
// options object) is reported; an exact origin, "/" or no origin is not.
module no_postmessage_wildcard_origin {
  type Recv = Window | ContentWindow | Parent | Opener | Computed | OptionalOpener
  type Origin = StarLit | StarTpl | Exact | Slash | OptsStar | OptsExact | Missing
  type Ctx = Prod | TestDefault | TestFlipped

  pure def isWildcard(o: Origin): bool = match o {
    | StarLit => true
    | StarTpl => true
    | OptsStar => true
    | _ => false
  }

  // allowInTests defaults to true.
  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(r: Recv, o: Origin, c: Ctx): bool = not(skipped(c)) and isWildcard(o)

  var recv: Recv
  var origin: Origin
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet r = Set(Window, ContentWindow, Parent, Opener, Computed, OptionalOpener).oneOf()
    nondet o = Set(StarLit, StarTpl, Exact, Slash, OptsStar, OptsExact, Missing).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { recv' = r, origin' = o, ctx' = c, verdict' = reports(r, o, c) }
  }

  action init = step
}
