// Model of eslint-plugin-secure-coding/no-unchecked-loop-condition (CWE-400/835).
// Contract ("reports only what it can prove"): an infinite loop form
// (while(true), for(;;), do..while(true), while(1)) with no exit is reported; a
// break/return/throw that leaves the loop is an exit (a `break` while
// allowWhileTrueWithBreak is false is reported anyway). A `break` that only
// leaves a NESTED inner loop is not an exit. A loop bound reached from user
// input, or a literal bound above maxStaticIterations (10000), is reported; a
// clamped bound and a small literal are not.
module no_unchecked_loop_condition {
  type Loop = WhileTrue | ForEver | DoWhileTrue | WhileOne | ForBound | WhileBound
  type Exit = NoExit | Break | Return | Throw | NestedBreak
  type Bound = ReqDirect | ParseIntReq | Clamped | SmallLit | HugeLit

  pure def infinite(l: Loop): bool = Set(WhileTrue, ForEver, DoWhileTrue, WhileOne).contains(l)

  pure def reports(l: Loop, e: Exit, b: Bound, allowBreak: bool): bool =
    if (infinite(l)) Set(NoExit, NestedBreak).contains(e) or (e == Break and not(allowBreak))
    else Set(ReqDirect, ParseIntReq, HugeLit).contains(b)

  var loop: Loop
  var exit: Exit
  var bound: Bound
  var allowBreak: bool
  var verdict: bool

  action step = {
    nondet l = Set(WhileTrue, ForEver, DoWhileTrue, WhileOne, ForBound, WhileBound).oneOf()
    nondet e = (if (infinite(l)) Set(NoExit, Break, Return, Throw, NestedBreak) else Set(NoExit)).oneOf()
    nondet b = (if (infinite(l)) Set(SmallLit) else Set(ReqDirect, ParseIntReq, Clamped, SmallLit, HugeLit)).oneOf()
    nondet a = (if (e == Break) Set(true, false) else Set(true)).oneOf()
    all { loop' = l, exit' = e, bound' = b, allowBreak' = a, verdict' = reports(l, e, b, a) }
  }

  action init = step
}
