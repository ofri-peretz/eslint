// Model of eslint-plugin-maintainability/consistent-function-scoping.
// A function declared inside another function that uses nothing from it is
// recreated on every call and can move to the outer scope. The rule reports a
// nested helper - a function declaration, or a function or arrow expression
// bound to a `const` - that references no binding of its enclosing function.
// What counts is the binding, not the name:
//   - a variable it declares itself under an outer name (`const factor`)
//     shadows the outer one and is not a use;
//   - a module-level binding is reachable from the outer scope too, so using
//     only module bindings still lets the helper move;
//   - a use counts wherever it is: in a nested callback, a default parameter
//     value, a type annotation naming an outer type, or a call of a sibling
//     helper that the outer function declares.
// `checkArrowFunctions` (default true): arrow helpers are checked; false skips
// them (function declarations and function expressions are still checked).
// It does not report:
//   - a function at module level (there is no outer scope to move it to);
//   - an inline callback (`xs.map((x) => x * 2)`), which is an argument, not
//     a declared helper;
//   - an arrow helper that uses `this`: an arrow's `this` is the enclosing
//     one. (A `function` helper's `this` is its own, set by its caller, so
//     using it does not tie the helper to the enclosing scope.)
// Left out (judgment): helpers in a module-level block.
module consistent_function_scoping {
  type Shape = FunctionDecl | ArrowConst | FunctionExprConst | InlineCallback
  type Uses = NoOuter | OuterParam | OuterLocal | ShadowedOuterName | ModuleVar | UsesThis
    | OuterInNestedCallback | OuterInDefaultParam | OuterType | OuterSibling
  type Container = OuterFunction | ClassMethod | ModuleLevel

  pure def movable(s: Shape, u: Uses): bool =
    Set(NoOuter, ShadowedOuterName, ModuleVar).contains(u) or (u == UsesThis and s != ArrowConst)
  pure def reports(s: Shape, u: Uses, c: Container, arrows: bool): bool =
    c != ModuleLevel and s != InlineCallback and (s != ArrowConst or arrows) and movable(s, u)

  var shape: Shape
  var uses: Uses
  var container: Container
  var checkArrowFunctions: bool
  var verdict: bool

  action step = {
    nondet s = Set(FunctionDecl, ArrowConst, FunctionExprConst, InlineCallback).oneOf()
    nondet u = Set(NoOuter, OuterParam, OuterLocal, ShadowedOuterName, ModuleVar, UsesThis,
                   OuterInNestedCallback, OuterInDefaultParam, OuterType, OuterSibling).oneOf()
    nondet c = Set(OuterFunction, ClassMethod, ModuleLevel).oneOf()
    nondet a = Set(false, true).oneOf()
    all {
      shape' = s, uses' = u, container' = c, checkArrowFunctions' = a,
      verdict' = reports(s, u, c, a),
    }
  }

  action init = step
}
