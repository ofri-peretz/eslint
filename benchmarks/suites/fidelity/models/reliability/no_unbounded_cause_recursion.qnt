// Model of eslint-plugin-reliability/no-unbounded-cause-recursion (CWE-674).
// A function that calls itself on an error's .cause (directly, through a
// variable or a { cause } destructuring) or passes itself to .errors.map
// follows a chain that can be cyclic: err.cause = err is legal, so the walk
// overflows the stack. It is reported unless it carries a guard:
//   SeenSet        - one variable is both looked up (has) and recorded (add)
//   Marker         - a module symbol written on the error and tested with in
//   HelperMemo     - a memo passed with the error to a helper in an if test
//                    and to another helper outside it (core-js)
//   DepthBound     - a parameter is compared (>) and passed changed (+ 1)
//   ArgumentsDepth - the same depth read from arguments[2], as a transpiler
//                    writes a default parameter (axe-core)
// A set that is only written, a depth passed unchanged, a depth passed
// changed but never compared, and the walked error itself tested and passed
// to helpers (WalkedHelper) are not guards. errors.map(self) passes no
// depth, so a depth bound does not guard it. A loop walk and a recursion on
// a property other than cause are not reported. The function may be a
// declaration, a const arrow, or a named function expression.
module no_unbounded_cause_recursion {
  type Walk = CauseArg | DestructuredCause | VarCause | ErrorsMap | LoopWalk | OtherProp
  type Guard = NoGuard | SeenSet | WriteOnlySet | Marker | HelperMemo | WalkedHelper
             | DepthBound | ArgumentsDepth | DepthUnchanged | DepthUncompared
  type Form = Declaration | ConstArrow | NamedExpr

  pure def recursesOnCause(w: Walk): bool =
    Set(CauseArg, DestructuredCause, VarCause, ErrorsMap).contains(w)

  pure def guarded(w: Walk, g: Guard): bool =
    Set(SeenSet, Marker, HelperMemo).contains(g)
      or (Set(DepthBound, ArgumentsDepth).contains(g) and w != ErrorsMap)

  pure def reports(w: Walk, g: Guard, f: Form): bool =
    recursesOnCause(w) and not(guarded(w, g))

  var walk: Walk
  var guard: Guard
  var form: Form
  var verdict: bool

  action step = {
    nondet w = Set(CauseArg, DestructuredCause, VarCause, ErrorsMap, LoopWalk, OtherProp).oneOf()
    nondet g = Set(NoGuard, SeenSet, WriteOnlySet, Marker, HelperMemo, WalkedHelper,
                   DepthBound, ArgumentsDepth, DepthUnchanged, DepthUncompared).oneOf()
    nondet f = Set(Declaration, ConstArrow, NamedExpr).oneOf()
    all { walk' = w, guard' = g, form' = f, verdict' = reports(w, g, f) }
  }

  action init = step
}
