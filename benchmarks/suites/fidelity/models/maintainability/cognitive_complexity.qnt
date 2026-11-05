// Model of eslint-plugin-maintainability/cognitive-complexity.
// Cognitive complexity (SonarSource) scores how hard a function is to read;
// the rule reports a function whose score exceeds `maxComplexity` (default
// 15). Increments, from the documented factor table and the SonarSource
// definition it follows:
//   - +1 for each `if`, ternary, loop (`for`, `for...of`, `for...in`,
//     `while`, `do...while`) and `catch`, plus the current nesting level for
//     each of them;
//   - +1 for `else if` and for `else` (no nesting increment);
//   - +1 for each SEQUENCE of like logical operators (`a && b && c` is one,
//     `a && b || c` is two), and +1 for `??`;
//   - +1 for recursion: a call that reaches the function's own binding. A
//     call of a local that happens to share the function's name is not
//     recursion.
// Every function form is scored: a declaration, an arrow, a class method and
// an arrow-function class property. `includeMetrics` only changes the message.
// Left out (judgment): `switch` - the factor table says "+1 per case", the
// SonarSource definition it cites says +1 per `switch`; nested functions; and
// recursion through `this.method()`, whose target depends on the receiver.
module cognitive_complexity {
  type Shape = Decl | Arrow | Method | ClassArrowProp
  type Elem = Flat | IfFlat | IfElse | ElseIfChain | NestedIf | ForWithIf | Ternary | LogicalSame
    | LogicalMixed | Nullish | TryCatch | While | DoWhile | ForIn | Recursion | ShadowedSelfCall
  type Max = MaxDefault | MaxOne | MaxTwo

  pure def score(e: Elem): int =
    if (Set(ElseIfChain, NestedIf, ForWithIf, LogicalMixed).contains(e)) 3
    else if (Set(IfElse, LogicalSame, Recursion).contains(e)) 2
    else if (e == Flat) 0
    else 1
  pure def limit(m: Max): int = if (m == MaxOne) 1 else if (m == MaxTwo) 2 else 15

  var shape: Shape
  var elem: Elem
  var max: Max
  var includeMetrics: bool
  var verdict: bool

  action step = {
    nondet s = Set(Decl, Arrow, Method, ClassArrowProp).oneOf()
    val common = Set(Flat, IfFlat, IfElse, ElseIfChain, NestedIf, ForWithIf, Ternary, LogicalSame,
                     LogicalMixed, Nullish, TryCatch, While, DoWhile, ForIn, ShadowedSelfCall)
    nondet e = (if (s == Decl or s == Arrow) common.union(Set(Recursion)) else common).oneOf()
    nondet m = Set(MaxDefault, MaxOne, MaxTwo).oneOf()
    nondet im = Set(false, true).oneOf()
    all { shape' = s, elem' = e, max' = m, includeMetrics' = im, verdict' = score(e) > limit(m) }
  }

  action init = step
}
