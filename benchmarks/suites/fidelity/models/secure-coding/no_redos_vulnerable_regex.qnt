// Model of eslint-plugin-secure-coding/no-redos-vulnerable-regex (CWE-400/1333).
// Contract: a pattern with genuine NFA ambiguity is reported (nested quantifiers,
// overlapping alternation, ambiguous repetition), including second-degree
// polynomial backtracking (reportSecondDegreePolynomial defaults on). Linear
// patterns, an atomic-group emulation, and the documented anchored Stripe URL
// are clean. An unparseable pattern is not reported. Same verdict for a regex
// literal, `new RegExp('...')` and `RegExp('...')`.
module no_redos_vulnerable_regex {
  type Pat = NestedPlus | NestedClassStar | OverlapAlt | DotStarStar | Quadratic
           | Simple | ClassPlus | Atomic | StripeUrl | Unparseable
  type Spelling = Literal | NewCtor | CallCtor

  pure def reports(p: Pat): bool = Set(NestedPlus, NestedClassStar, OverlapAlt, DotStarStar, Quadratic).contains(p)

  var pat: Pat
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet p = Set(NestedPlus, NestedClassStar, OverlapAlt, DotStarStar, Quadratic,
                   Simple, ClassPlus, Atomic, StripeUrl, Unparseable).oneOf()
    nondet sp = (if (p == Unparseable) Set(NewCtor, CallCtor) else Set(Literal, NewCtor, CallCtor)).oneOf()
    all { pat' = p, spelling' = sp, verdict' = reports(p) }
  }

  action init = step
}
