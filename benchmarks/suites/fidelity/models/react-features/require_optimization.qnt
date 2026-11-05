// Model of eslint-plugin-react-features/require-optimization.
// Modelled: the `considerMemo` suggestion. A function component (a function
// whose name is PascalCase, as React defines a component: a declaration, an
// arrow or a function expression bound to such a name) that destructures at
// least `minPropsForMemo` props (default 3) and is not wrapped in React's
// `memo` is reported. Wrapped means passed to `memo` (by binding: a named,
// renamed or `React.memo` reference), inline or later
// (`export default memo(Card)`). `suggestMemo: false` turns it off, and a
// camelCase function is not a component.
// Left out: candidate for change (fires on a guess): `considerUseMemo` (any
// `.map` / `.filter` call is read as an expensive computation),
// `considerUseCallback` (every inline handler, whether or not a memoized
// child receives it), `considerLazy` (a line count), `considerPureComponent`
// (a class's prop count or array calls), and a PascalCase function that
// renders nothing. The inputs below trigger none of those.
module require_optimization {
  type Props = Two | Three | Five
  type Form = FnDecl | Arrow | FnExpr | MemoLater | MemoInlineArrow | ReactMemoFnExpr | Lowercase
  type Opt = Defaults | Min5 | MemoOff

  pure def count(p: Props): int = if (p == Two) 2 else if (p == Three) 3 else 5
  pure def min(o: Opt): int = if (o == Min5) 5 else 3
  pure def unwrapped(f: Form): bool = Set(FnDecl, Arrow, FnExpr).contains(f)
  pure def reports(p: Props, f: Form, o: Opt): bool =
    o != MemoOff and unwrapped(f) and count(p) >= min(o)

  var props: Props
  var form: Form
  var opt: Opt
  var verdict: bool

  action step = {
    nondet p = Set(Two, Three, Five).oneOf()
    nondet f = Set(FnDecl, Arrow, FnExpr, MemoLater, MemoInlineArrow, ReactMemoFnExpr,
                   Lowercase).oneOf()
    nondet o = Set(Defaults, Min5, MemoOff).oneOf()
    all { props' = p, form' = f, opt' = o, verdict' = reports(p, f, o) }
  }

  action init = step
}
