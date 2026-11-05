// Model of eslint-plugin-react-features/react-no-inline-functions.
// An inline function written as a prop (an arrow, a function expression, a
// choice between them) is a new function every render. It costs a re-render
// only when the receiver compares props by identity: a component this file
// wraps in React's `memo` (any spelling) or a `PureComponent` class. On a host
// element, or a component defined without memo, it is silent.
// `allowInEventHandlers` (default false) exempts event-handler props, which
// React names `on` + a capital letter (`onClick`); `only` or `renderItem` is
// not one. A callback passed to a call in JSX children (`items.map(i => <li/>)`)
// is not a prop and causes no re-render: silent. A function child
// (`<Row>{() => …}</Row>`) is the `children` prop, judged like any other prop
// (and never an event handler). `minArraySize` is documented
// as having no effect (an array's size is not known statically).
// Left out: candidate for change (fires on a guess): a component the file
// cannot see (an import, a member such as `<Ui.Row>`).
module react_no_inline_functions {
  type Focus = Prop | ChildFn | MapCallback
  type Receiver = Dom | CustomEl | MemoNamed | MemoDefault | MemoRenamed | MemoForwardRef
                | PureClass | PlainFn | PlainArrow | ForwardRef | PlainClass
  type Value = Arrow | FnExpr | CondFn | Ident
  type Name = OnClick | Only | RenderItem
  type Allow = Off | On

  pure def memoized(r: Receiver): bool =
    Set(MemoNamed, MemoDefault, MemoRenamed, MemoForwardRef, PureClass).contains(r)
  pure def reports(f: Focus, r: Receiver, v: Value, n: Name, a: Allow): bool =
    f != MapCallback and memoized(r) and v != Ident
      and not(f == Prop and a == On and n == OnClick)

  var focus: Focus
  var receiver: Receiver
  var value: Value
  var name: Name
  var allow: Allow
  var verdict: bool

  action step = {
    nondet f = Set(Prop, ChildFn, MapCallback).oneOf()
    nondet r = (if (f != MapCallback)
                  Set(Dom, CustomEl, MemoNamed, MemoDefault, MemoRenamed, MemoForwardRef,
                      PureClass, PlainFn, PlainArrow, ForwardRef, PlainClass)
                else Set(Dom, MemoNamed)).oneOf()
    nondet v = (if (f == Prop) Set(Arrow, FnExpr, CondFn, Ident)
                else if (f == ChildFn) Set(Arrow, FnExpr, Ident)
                else Set(Arrow, FnExpr)).oneOf()
    nondet n = (if (f == Prop) Set(OnClick, Only, RenderItem) else Set(OnClick)).oneOf()
    nondet a = Set(Off, On).oneOf()
    all { focus' = f, receiver' = r, value' = v, name' = n, allow' = a,
          verdict' = reports(f, r, v, n, a) }
  }

  action init = step
}
