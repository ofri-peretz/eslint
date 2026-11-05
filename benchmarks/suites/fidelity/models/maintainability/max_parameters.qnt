// Model of eslint-plugin-maintainability/max-parameters (RSPEC-107).
// A function that takes more than `max` (default 4) parameters is hard to call
// correctly; the rule reports it in every function form: a declaration, an
// arrow, a function expression, a class method, a constructor, an arrow-
// function class property. It counts what a caller passes: a rest parameter
// is one parameter, and TypeScript's `this` parameter (erased before emit) is
// not counted.
//   - `ignoreConstructors` (default false): a class `constructor` is not
//     reported - its arity is often fixed by dependency injection.
//   - `ignoreOverriddenMethods` (default false): a method marked `override` is
//     not reported - its signature is the base class's decision.
// Left out: a capitalized function declaration under `ignoreConstructors`.
// The rule treats it as an ES5 constructor by its NAME: left out, candidate
// for change (fires on a guess - here, stays silent on one).
module max_parameters {
  type Form = FunctionDecl | Arrow | FunctionExpr | Method | Constructor | OverrideMethod | ClassArrowProp
  type Count = Four | Five | FourPlusThis | FiveWithRest
  type Max = MaxDefault | MaxSix

  pure def arity(c: Count): int = if (c == Five or c == FiveWithRest) 5 else 4
  pure def limit(m: Max): int = if (m == MaxSix) 6 else 4
  pure def reports(f: Form, c: Count, m: Max, ic: bool, io: bool): bool =
    arity(c) > limit(m) and not(f == Constructor and ic) and not(f == OverrideMethod and io)

  var form: Form
  var count: Count
  var max: Max
  var ignoreConstructors: bool
  var ignoreOverriddenMethods: bool
  var verdict: bool

  action step = {
    nondet f = Set(FunctionDecl, Arrow, FunctionExpr, Method, Constructor, OverrideMethod, ClassArrowProp).oneOf()
    nondet c = Set(Four, Five, FourPlusThis, FiveWithRest).oneOf()
    nondet m = Set(MaxDefault, MaxSix).oneOf()
    nondet ic = Set(false, true).oneOf()
    nondet io = Set(false, true).oneOf()
    all {
      form' = f, count' = c, max' = m, ignoreConstructors' = ic, ignoreOverriddenMethods' = io,
      verdict' = reports(f, c, m, ic, io),
    }
  }

  action init = step
}
