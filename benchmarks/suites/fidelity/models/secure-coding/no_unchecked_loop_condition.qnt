// Model of eslint-plugin-secure-coding/no-unchecked-loop-condition (CWE-400/835).
// Contract ("reports only what it can prove"): an infinite loop form
// (while(true), for(;;), do..while(true), while(1)) with no exit is reported; a
// break/return/throw that leaves the loop is an exit (a `break` while
// allowWhileTrueWithBreak is false is reported anyway). A `break` that only
// leaves a NESTED inner loop is not an exit. A loop bound reached from user
// input is reported; a clamped bound and a small literal are not. A literal
// bound is author-chosen, not input: it is reported only when the opt-in
// maxStaticIterations budget is set (`budget`) and the literal exceeds it. A bound destructured from the
// request (`const { count } = req.query`) is user input, and a BigInt literal
// bound (`1000000n`) is estimated like a number literal.
module no_unchecked_loop_condition {
  type Loop = WhileTrue | ForEver | DoWhileTrue | WhileOne | ForBound | WhileBound
  type Exit = NoExit | Break | Return | Throw | NestedBreak
  type Bound = ReqDirect | ParseIntReq | DestructReq | Clamped | SmallLit | HugeLit | HugeBigInt

  pure def infinite(l: Loop): bool = Set(WhileTrue, ForEver, DoWhileTrue, WhileOne).contains(l)

  pure def reports(l: Loop, e: Exit, b: Bound, allowBreak: bool, budget: bool): bool =
    if (infinite(l)) Set(NoExit, NestedBreak).contains(e) or (e == Break and not(allowBreak))
    else Set(ReqDirect, ParseIntReq, DestructReq).contains(b) or (budget and Set(HugeLit, HugeBigInt).contains(b))

  var loop: Loop
  var exit: Exit
  var bound: Bound
  var allowBreak: bool
  var budget: bool
  var verdict: bool

  action step = {
    nondet l = Set(WhileTrue, ForEver, DoWhileTrue, WhileOne, ForBound, WhileBound).oneOf()
    nondet e = (if (infinite(l)) Set(NoExit, Break, Return, Throw, NestedBreak) else Set(NoExit)).oneOf()
    nondet b = (if (infinite(l)) Set(SmallLit) else Set(ReqDirect, ParseIntReq, DestructReq, Clamped, SmallLit, HugeLit, HugeBigInt)).oneOf()
    nondet a = (if (e == Break) Set(true, false) else Set(true)).oneOf()
    nondet g = (if (infinite(l)) Set(false) else Set(true, false)).oneOf()
    all { loop' = l, exit' = e, bound' = b, allowBreak' = a, budget' = g, verdict' = reports(l, e, b, a, g) }
  }

  action init = step
}
