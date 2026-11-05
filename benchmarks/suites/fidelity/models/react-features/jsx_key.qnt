// Model of eslint-plugin-react-features/jsx-key.
// React's list contract: each element an iteration callback returns into an
// array (`items.map`, `items['map']`, `flatMap`, `Array.from(items, fn)`)
// needs a `key`. That covers a JSX element, a `<Fragment>` / `<>` (the
// shorthand cannot take a key, so it is always missing one) and
// `React.createElement(type, props)` with no `key` in its props; arrow,
// block-bodied and `function` callbacks, and either branch of a conditional.
// `React.Children.map` / `Children.map` assign keys themselves: not judged.
// With `warnUnstableKeys` (default on), a key that is the callback's index
// parameter (by binding, whatever it is called: `i`, `n`) is reported; a
// variable that is merely named `index` and holds something else is not.
// Judgment call (silent): a template built on the index (`row-${i}`).
// Left out: candidate for change (fires on a guess): `<li {...props} />`,
// where the spread may carry the key.
module jsx_key {
  type Focus = Missing | Unstable
  type Iter = ArrMap | MapComputed | FlatMap | ArrayFrom | ChildrenMap | ReactChildrenMap
  type Form = Arrow | Block | FnExpr | Cond
  type Elem = ElemNoKey | ElemKey | FragShort | FragmentNoKey | FragmentKey | CreateNoKey | CreateKey
  type KeyExpr = IndexParam | IndexRenamed | NamedIndexNotParam | Id | TemplateIndex
  type Opt = Default | Off

  pure def missing(e: Elem): bool = Set(ElemNoKey, FragShort, FragmentNoKey, CreateNoKey).contains(e)
  pure def reports(f: Focus, it: Iter, e: Elem, k: KeyExpr, o: Opt): bool =
    if (f == Missing) not(Set(ChildrenMap, ReactChildrenMap).contains(it)) and missing(e)
    else o == Default and Set(IndexParam, IndexRenamed).contains(k)

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
    nondet fo = (if (f == Missing) Set(Arrow, Block, FnExpr, Cond) else Set(Arrow)).oneOf()
    nondet e = (if (f == Missing) Set(ElemNoKey, ElemKey, FragShort, FragmentNoKey, FragmentKey, CreateNoKey, CreateKey)
                else Set(ElemKey)).oneOf()
    nondet k = (if (f == Unstable) Set(IndexParam, IndexRenamed, NamedIndexNotParam, Id, TemplateIndex)
                else Set(Id)).oneOf()
    nondet o = (if (f == Unstable) Set(Default, Off) else Set(Default)).oneOf()
    all { focus' = f, iter' = it, form' = fo, elem' = e, keyExpr' = k, opt' = o,
          verdict' = reports(f, it, e, k, o) }
  }

  action init = step
}
