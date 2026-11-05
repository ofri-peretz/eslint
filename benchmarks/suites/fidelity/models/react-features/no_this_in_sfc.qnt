// Model of eslint-plugin-react-features/no-this-in-sfc.
// A function component has no `this`: `this.props` in one is always a bug.
// A function component, as React defines it, is a function with a PascalCase
// name that returns JSX — a declaration, an arrow or function expression bound
// to a PascalCase name, an `export default function` returning JSX — or a
// function passed to React's `memo` / `forwardRef`. Reported: `this` used in
// one, directly or in an arrow inside it (arrows have no `this` of their own).
// Not reported: `this` inside a nested `function` or an object method (they
// have their own `this`); a PascalCase constructor function that does not
// return JSX (`function Counter() { this.count = 0; }`); a lowercase helper
// that returns JSX; a class component's methods; a component with no `this`.
module no_this_in_sfc {
  type Shape = FnDecl | Arrow | FnExpr | Memo | ForwardRef | ExportDefault | Lowercase
             | Constructor | ClassComp
  type Where = Body | NestedArrow | NestedFunction | ObjectMethod | NoThis

  pure def isSfc(s: Shape): bool =
    Set(FnDecl, Arrow, FnExpr, Memo, ForwardRef, ExportDefault).contains(s)
  pure def reports(s: Shape, w: Where): bool =
    isSfc(s) and (w == Body or w == NestedArrow)

  var shape: Shape
  var where: Where
  var verdict: bool

  action step = {
    nondet s = Set(FnDecl, Arrow, FnExpr, Memo, ForwardRef, ExportDefault, Lowercase,
                   Constructor, ClassComp).oneOf()
    nondet w = Set(Body, NestedArrow, NestedFunction, ObjectMethod, NoThis).oneOf()
    all { shape' = s, where' = w, verdict' = reports(s, w) }
  }

  action init = step
}
