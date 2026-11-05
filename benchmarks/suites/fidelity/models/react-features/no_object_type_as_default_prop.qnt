// Model of eslint-plugin-react-features/no-object-type-as-default-prop.
// A default for a destructured prop is evaluated on every render, so an
// object, array or function literal there is a new reference each time,
// which defeats `memo` and dependency arrays. Reported: such a literal as the
// default of a destructured prop of a function component (as React defines
// one: a PascalCase function returning JSX, or a function passed to React's
// `memo`). Not reported: a constant, a primitive, `null`; the same default in
// a function that is not a component (a lowercase helper, a PascalCase
// function that returns no JSX); a class's `static defaultProps`, which is
// evaluated once, not per render.
// Left out (judgment): `new X()` and regex literals as defaults.
module no_object_type_as_default_prop {
  type Shape = FnDecl | Arrow | Memo | Helper | Util | ClassStatic
  type Value = ObjectLit | ArrayLit | ArrowFn | FnExpr | Const | Num | Null_ | Str

  pure def isComponent(s: Shape): bool = Set(FnDecl, Arrow, Memo).contains(s)
  pure def isFresh(v: Value): bool = Set(ObjectLit, ArrayLit, ArrowFn, FnExpr).contains(v)
  pure def reports(s: Shape, v: Value): bool = isComponent(s) and isFresh(v)

  var shape: Shape
  var value: Value
  var verdict: bool

  action step = {
    nondet s = Set(FnDecl, Arrow, Memo, Helper, Util, ClassStatic).oneOf()
    nondet v = Set(ObjectLit, ArrayLit, ArrowFn, FnExpr, Const, Num, Null_, Str).oneOf()
    all { shape' = s, value' = v, verdict' = reports(s, v) }
  }

  action init = step
}
