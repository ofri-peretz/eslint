// Model of eslint-plugin-postgresql-security/prevent-double-release.
// A pool client released twice on one execution path hands the pool a
// connection it already holds: phantom connections, timeouts, corrupted pool
// state. Reported (the documented pattern table): two releases in one block,
// catch + finally, try + finally, finally + after the try, try + after the
// try, a switch case falling through into another release, a conditional
// (`?:` / `&&`) release followed by an unconditional one, a destructured
// `release()` called twice, and the string-subscript `client['release']()`.
// Not reported: a single release in `finally`, a guarded `safeRelease()`,
// releases in opposite `if`/`else` branches, an early `return` that releases
// first, a catch that releases and rethrows plus a release after the try, a
// release at the very end of `try` plus one in its catch, and a retry loop
// that checks out a fresh client on each pass. Files with no PostgreSQL
// import are not judged.
module prevent_double_release {
  type Receiver =
    | Named | Default | Namespace | Renamed | Require | RequireMember
    | Injected | NoImport
  type Body =
    | SameBlock | CatchFinally | TryFinally | FinallyAfter | TryAfter
    | SwitchFallthrough | TernarySequential | ShortCircuitSequential
    | Destructured | BracketTwice
    | SingleFinally | Guarded | IfElse | EarlyReturn | CatchRethrowAfter
    | TryEndPlusCatch | RetryLoop

  pure def double(b: Body): bool = match b {
    | SameBlock => true
    | CatchFinally => true
    | TryFinally => true
    | FinallyAfter => true
    | TryAfter => true
    | SwitchFallthrough => true
    | TernarySequential => true
    | ShortCircuitSequential => true
    | Destructured => true
    | BracketTwice => true
    | SingleFinally => false
    | Guarded => false
    | IfElse => false
    | EarlyReturn => false
    | CatchRethrowAfter => false
    | TryEndPlusCatch => false
    | RetryLoop => false
  }

  pure def reports(r: Receiver, b: Body): bool = r != NoImport and double(b)

  var receiver: Receiver
  var body: Body
  var verdict: bool

  action step = {
    nondet r = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Injected,
      NoImport,
    ).oneOf()
    nondet b = Set(
      SameBlock, CatchFinally, TryFinally, FinallyAfter, TryAfter,
      SwitchFallthrough, TernarySequential, ShortCircuitSequential,
      Destructured, BracketTwice,
      SingleFinally, Guarded, IfElse, EarlyReturn, CatchRethrowAfter,
      TryEndPlusCatch, RetryLoop,
    ).oneOf()
    all { receiver' = r, body' = b, verdict' = reports(r, b) }
  }

  action init = step
}
