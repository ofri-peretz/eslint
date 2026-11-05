// Model of eslint-plugin-maintainability/no-unreadable-iife.
// An immediately invoked function expression (IIFE) that does a lot hides
// logic that a named function would document. The rule reports an IIFE -
// a function or arrow expression called on the spot, `async` too, also through
// `.call(...)` / `.apply(...)` - whose block body:
//   - holds more than `maxStatements` (default 3) statements, or
//   - nests control flow (`if`, loops, `switch`, `try`) more than `maxDepth`
//     (default 2) levels deep.
// `allowReturningIIFE` (default true): an IIFE whose body returns a value is a
// scoped initializer (`const config = (() => { ...; return x; })()`) and is
// not reported for its statement count; its nesting is still checked.
// It does not report a short IIFE because it holds a single `if` or `try`
// (the `(async () => { try { await main(); } catch (e) { ... } })()` entry
// point), declares a helper function, or takes three parameters: none of
// those exceeds a documented limit.
module no_unreadable_iife {
  type Form = Arrow | FunctionExpr | AsyncArrow | DotCall
  type Body = Small | Many | ManyReturning | TopIf | TryMain | Deep3 | Deep2 | NestedFn | ThreeParams
  type Opts = Defaults | MaxStatementsSix | NoReturnAllowance | MaxDepthThree

  pure def statements(b: Body): int =
    if (b == Many or b == ManyReturning) 5 else if (Set(Small, NestedFn, ThreeParams).contains(b)) 2 else 1
  pure def depth(b: Body): int =
    if (b == Deep3) 3 else if (b == Deep2) 2 else if (b == TopIf or b == TryMain) 1 else 0
  pure def maxStatements(o: Opts): int = if (o == MaxStatementsSix) 6 else 3
  pure def maxDepth(o: Opts): int = if (o == MaxDepthThree) 3 else 2
  pure def reports(b: Body, o: Opts): bool =
    (statements(b) > maxStatements(o) and not(o != NoReturnAllowance and b == ManyReturning))
      or depth(b) > maxDepth(o)

  var form: Form
  var body: Body
  var opts: Opts
  var verdict: bool

  action step = {
    nondet f = Set(Arrow, FunctionExpr, AsyncArrow, DotCall).oneOf()
    nondet b = Set(Small, Many, ManyReturning, TopIf, TryMain, Deep3, Deep2, NestedFn, ThreeParams).oneOf()
    nondet o = Set(Defaults, MaxStatementsSix, NoReturnAllowance, MaxDepthThree).oneOf()
    all { form' = f, body' = b, opts' = o, verdict' = reports(b, o) }
  }

  action init = step
}
