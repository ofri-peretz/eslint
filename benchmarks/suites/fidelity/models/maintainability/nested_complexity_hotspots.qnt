// Model of eslint-plugin-maintainability/nested-complexity-hotspots.
// Deeply nested control flow is hard to follow. The rule reports a control
// structure that sits more than `maxDepth` (default 4) levels deep, counting
// itself and every enclosing control structure. Kinds:
//   - conditionals: `if`, `switch` - reported while `countConditionals`
//     (default true);
//   - loops: `for`, `for...of`, `for...in`, `while`, `do...while` - reported
//     while `countLoops` (default true).
// An `else if` is a link of a flat chain, not a level: a long chain at depth
// one is not reported.
// Left out (judgment): mixed kinds under a disabled count (whether a disabled
// kind still adds a level), and nesting across a function boundary.
module nested_complexity_hotspots {
  type Kind = If | Switch | For | ForOf | ForIn | While | DoWhile | ElseIfChain
  type Max = MaxDefault | MaxThree

  pure def conditional(k: Kind): bool = k == If or k == Switch
  pure def limit(m: Max): int = if (m == MaxThree) 3 else 4
  pure def reports(k: Kind, d: int, m: Max, cc: bool, cl: bool): bool =
    k != ElseIfChain and d > limit(m) and (if (conditional(k)) cc else cl)

  var kind: Kind
  var depth: int
  var max: Max
  var countConditionals: bool
  var countLoops: bool
  var verdict: bool

  action step = {
    nondet k = Set(If, Switch, For, ForOf, ForIn, While, DoWhile, ElseIfChain).oneOf()
    nondet d = Set(3, 4, 5).oneOf()
    nondet m = Set(MaxDefault, MaxThree).oneOf()
    nondet cc = Set(false, true).oneOf()
    nondet cl = Set(false, true).oneOf()
    all {
      kind' = k, depth' = d, max' = m, countConditionals' = cc, countLoops' = cl,
      verdict' = reports(k, d, m, cc, cl),
    }
  }

  action init = step
}
