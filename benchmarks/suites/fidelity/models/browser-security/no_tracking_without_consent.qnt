// Model of eslint-plugin-browser-security/no-tracking-without-consent (CWE-359).
// A tracking call (analytics.<analyticsMethods>, gtag) reports unless it only
// runs when a consent flag is TRUE: inside `if (consent)`, the true arm of
// `consent ? ... : ...`, the right of `consent && ...`, or after an early
// `if (!consent) return;`. A consent flag is recognised by name against
// consentIdentifiers, which REPLACES the default vocabulary when set.
module no_tracking_without_consent {
  type Call = Track | Identify | Gtag | Alias
  type Shape =
    | NoGuard
    | IfPos
    | IfNeg
    | ElseOfPos
    | TernaryPos
    | TernaryNeg
    | TernaryElse
    | AndPos
    | AndNeg
    | OrPos
    | EarlyReturnNeg
    | EarlyReturnPos
  type Guard = HasConsent | PrivacyOk | ConsentFn | IsMobile

  pure def isTracking(c: Call, methodsOpt: bool): bool = match c {
    | Track => true
    | Identify => true
    | Gtag => true
    | Alias => methodsOpt
  }

  pure def isConsent(g: Guard, custom: bool): bool = match g {
    | HasConsent => not(custom)
    | ConsentFn => not(custom)
    | PrivacyOk => custom
    | IsMobile => false
  }

  pure def onlyWhenTrue(s: Shape): bool = match s {
    | IfPos => true
    | TernaryPos => true
    | AndPos => true
    | EarlyReturnNeg => true
    | _ => false
  }

  pure def reports(c: Call, s: Shape, g: Guard, custom: bool, methodsOpt: bool): bool =
    isTracking(c, methodsOpt) and not(onlyWhenTrue(s) and isConsent(g, custom))

  var call: Call
  var shape: Shape
  var guard: Guard
  var custom: bool
  var methodsOpt: bool
  var verdict: bool

  action step = {
    nondet c = Set(Track, Identify, Gtag, Alias).oneOf()
    nondet s = Set(NoGuard, IfPos, IfNeg, ElseOfPos, TernaryPos, TernaryNeg, TernaryElse, AndPos, AndNeg, OrPos, EarlyReturnNeg, EarlyReturnPos).oneOf()
    nondet g = Set(HasConsent, PrivacyOk, ConsentFn, IsMobile).oneOf()
    nondet o = Set(true, false).oneOf()
    nondet m = Set(true, false).oneOf()
    all {
      call' = c, shape' = s, guard' = g, custom' = o, methodsOpt' = m,
      verdict' = reports(c, s, g, o, m),
    }
  }

  action init = step
}
