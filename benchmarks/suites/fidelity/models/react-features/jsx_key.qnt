// Model of eslint-plugin-react-features/jsx-key.
// React's list contract: each element an iteration callback returns into an
// array (`items.map`, `items['map']`, `flatMap`, `Array.from(items, fn)`)
// needs a `key`. That covers a JSX element and
// `React.createElement(type, props)` with no `key` in its props, in the
// callback's return position only: an arrow body, a `return` argument, or
// either branch of a conditional. A value bound to a variable inside the
// callback (`const el = <li />; return <li key={k}>{el}</li>`) is not a list
// item and is not judged.
// `<Fragment>` without a key is an element and is reported. The shorthand
// `<>` cannot take a key; it is reported only with `checkFragmentShorthand`
// (default false), as eslint-plugin-react does.
// `React.Children.map` / `Children.map` assign keys themselves: not judged.
// A key that is the callback's index parameter (by binding, whatever it is
// called: `i`, `n`) is reported only with `warnUnstableKeys` (default false;
// eslint-plugin-react leaves it to `no-array-index-key`); a variable that is
// merely named `index` and holds something else is never reported.
// Judgment call (silent): a template built on the index (`row-${i}`).
// Left out: candidate for change (fires on a guess): `<li {...props} />`,
// where the spread may carry the key.
// Spec change, for review: eslint-plugin-react 7.37.5 lib/rules/jsx-key.js
// :22 (defaults), :48-65 (schema: no index-key option), :101 (fragment only
// under checkFragmentShorthand), :112-176 (return and arrow-body positions
// only); tests/lib/rules/jsx-key.js :58 and :269-271.
module jsx_key {
  type Focus = Missing | Unstable
  type Iter = ArrMap | MapComputed | FlatMap | ArrayFrom | ChildrenMap | ReactChildrenMap
  type Form = Arrow | Block | FnExpr | Cond | Bound
  type Elem = ElemNoKey | ElemKey | FragShort | FragmentNoKey | FragmentKey | CreateNoKey | CreateKey
  type KeyExpr = IndexParam | IndexRenamed | NamedIndexNotParam | Id | TemplateIndex
  type Opt = Default | CheckFragments | WarnUnstable

  pure def missing(e: Elem, o: Opt): bool =
    Set(ElemNoKey, FragmentNoKey, CreateNoKey).contains(e) or (e == FragShort and o == CheckFragments)
  pure def reports(f: Focus, it: Iter, fo: Form, e: Elem, k: KeyExpr, o: Opt): bool =
    if (f == Missing) not(Set(ChildrenMap, ReactChildrenMap).contains(it)) and fo != Bound and missing(e, o)
    else o == WarnUnstable and Set(IndexParam, IndexRenamed).contains(k)

  var focus: Focus
  var iter: Iter
  var form: Form
  var elem: Elem
  var keyExpr: KeyExpr
  var opt: Opt
  var verdict: bool

  action step = {
    nondet f = Set(Missing, Unstable).oneOf()
    nondet it = (if (f == Missing) Set(ArrMap, MapComputed, FlatMap, ArrayFrom, ChildrenMap, ReactChildrenMap)
                 else Set(ArrMap)).oneOf()
    nondet fo = (if (f == Missing) Set(Arrow, Block, FnExpr, Cond, Bound) else Set(Arrow)).oneOf()
    nondet e = (if (f == Missing) Set(ElemNoKey, ElemKey, FragShort, FragmentNoKey, FragmentKey, CreateNoKey, CreateKey)
                else Set(ElemKey)).oneOf()
    nondet k = (if (f == Unstable) Set(IndexParam, IndexRenamed, NamedIndexNotParam, Id, TemplateIndex)
                else Set(Id)).oneOf()
    nondet o = (if (f == Unstable) Set(Default, WarnUnstable) else Set(Default, CheckFragments)).oneOf()
    all { focus' = f, iter' = it, form' = fo, elem' = e, keyExpr' = k, opt' = o,
          verdict' = reports(f, it, fo, e, k, o) }
  }

  action init = step
}
