// Model of eslint-plugin-reliability/no-await-in-loop.
// An `await` that runs once per iteration serialises work that could run
// concurrently: N x latency instead of 1x. The rule reports an await evaluated
// on every iteration of a for / for-in / for-of / while / do-while loop: in the
// body, in a nested block of it, or in a per-iteration header slot (a `for`
// test, a `while` / do-while condition). It does not report:
//   - an await in a slot evaluated once before iterating (the for-of / for-in
//     iterable, a `for` initialiser) or before the loop;
//   - an await inside a function defined in the loop (it runs in its own
//     async context, not the loop's);
//   - an await whose result the NEXT iteration needs (a cursor the loop test
//     reads, an accumulator fed back into the next await): the code proves the
//     work cannot run concurrently, which the docs show as the correct shape
//     ("When Sequential is Required").
// `allowForOf` exempts for-of loops, `allowWhile` while and do-while loops
// (both default false). `checkConcurrency` (default true) shapes the advice,
// never whether a loop is reported.
module no_await_in_loop {
  type Focus = Positions | Options | Deps | Concurrency
  type Loop = ForOf | ForIn | ForClassic | While | DoWhile
  type Pos = Body | NestedBlock | OnceSlot | Test | InnerCallback | NoAwait
  type Dep = Independent | Carried

  pure def perIteration(p: Pos): bool = Set(Body, NestedBlock, Test).contains(p)
  pure def allowed(l: Loop, allowForOf: bool, allowWhile: bool): bool =
    (allowForOf and l == ForOf) or (allowWhile and Set(While, DoWhile).contains(l))
  pure def reports(l: Loop, p: Pos, d: Dep, allowForOf: bool, allowWhile: bool): bool =
    perIteration(p) and d == Independent and not(allowed(l, allowForOf, allowWhile))

  var focus: Focus
  var loop: Loop
  var pos: Pos
  var dep: Dep
  var allowForOf: bool
  var allowWhile: bool
  var checkConcurrency: bool
  var verdict: bool

  action step = {
    nondet fo = Set(Positions, Options, Deps, Concurrency).oneOf()
    nondet l = (if (fo == Deps) Set(ForOf, ForClassic, While, DoWhile)
                else if (fo == Concurrency) Set(ForOf, While)
                else Set(ForOf, ForIn, ForClassic, While, DoWhile)).oneOf()
    nondet p = (if (fo == Positions) Set(Body, NestedBlock, OnceSlot, Test, InnerCallback, NoAwait)
                else Set(Body)).oneOf()
    nondet d = (if (fo == Deps) Set(Independent, Carried) else Set(Independent)).oneOf()
    nondet af = (if (fo == Options) Set(false, true) else Set(false)).oneOf()
    nondet aw = (if (fo == Options) Set(false, true) else Set(false)).oneOf()
    nondet cc = (if (fo == Concurrency) Set(false, true) else Set(true)).oneOf()
    all { focus' = fo, loop' = l, pos' = p, dep' = d, allowForOf' = af, allowWhile' = aw,
          checkConcurrency' = cc, verdict' = reports(l, p, d, af, aw) }
  }

  action init = step
}
