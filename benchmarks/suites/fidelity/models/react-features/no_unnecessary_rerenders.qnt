// Model of eslint-plugin-react-features/no-unnecessary-rerenders.
// A prop value created during render (an object or array literal, an inline
// function, a choice between inline functions) has a new identity every
// render. That costs a re-render only when the receiver skips re-rendering on
// equal props: a component this file wraps in React's `memo` (any spelling:
// named, renamed, `React.memo`, `memo(forwardRef(...))`) or a `PureComponent`
// class. A host element (`<div>`, `<my-widget>`) has no render to save, and a
// component defined without memo (function, arrow, `forwardRef`, `Component`
// class) re-renders with its parent anyway: both are silent.
// `minSize` (default 5) is the smallest object / array literal reported; a
// function is reported at any size. A value that is not created in render (an
// identifier) is silent. `ignoreInTests` (default true) skips *.test / *.spec.
// Left out: candidate for change (fires on a guess): a component the file
// cannot see (an import, `<Ctx.Provider>`, `<Ui.Row>`): whether it compares
// props by identity is unknown.
module no_unnecessary_rerenders {
  type Receiver = Dom | CustomEl | MemoNamed | MemoDefault | MemoRenamed | MemoForwardRef
                | PureClass | PlainFn | PlainArrow | ForwardRef | PlainClass
  type Value = Obj1 | Obj2 | Obj5 | Arr2 | Arr5 | Arrow | FnExpr | CondFn | Ident
  type MinSize = Five | Two
  type TestCtx = Prod | TestDefault | TestFlip

  pure def memoized(r: Receiver): bool =
    Set(MemoNamed, MemoDefault, MemoRenamed, MemoForwardRef, PureClass).contains(r)
  pure def litSize(v: Value): int =
    if (v == Obj1) 1 else if (v == Obj2 or v == Arr2) 2 else 5
  pure def fresh(v: Value, m: MinSize): bool =
    if (Set(Arrow, FnExpr, CondFn).contains(v)) true
    else if (v == Ident) false
    else litSize(v) >= (if (m == Five) 5 else 2)
  pure def reports(r: Receiver, v: Value, m: MinSize, t: TestCtx): bool =
    t != TestDefault and memoized(r) and fresh(v, m)

  var receiver: Receiver
  var value: Value
  var minSize: MinSize
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet r = Set(Dom, CustomEl, MemoNamed, MemoDefault, MemoRenamed, MemoForwardRef,
                   PureClass, PlainFn, PlainArrow, ForwardRef, PlainClass).oneOf()
    nondet v = Set(Obj1, Obj2, Obj5, Arr2, Arr5, Arrow, FnExpr, CondFn, Ident).oneOf()
    nondet m = Set(Five, Two).oneOf()
    nondet t = Set(Prod, TestDefault, TestFlip).oneOf()
    all { receiver' = r, value' = v, minSize' = m, testCtx' = t,
          verdict' = reports(r, v, m, t) }
  }

  action init = step
}
