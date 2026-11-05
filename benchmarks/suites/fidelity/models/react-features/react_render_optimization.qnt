// Model of eslint-plugin-react-features/react-render-optimization.
// Same contract as no-unnecessary-rerenders for inline props: an object or
// array literal (`detectInlineProps`, default true) or an inline function
// (`detectInlineFunctions`, default true) written as a prop is reported only
// when the receiver compares props by identity: a component this file wraps
// in React's `memo` (any spelling) or a `PureComponent` class. A host element
// and a component defined without memo re-render regardless: silent. A string
// or an identifier is not created in render: silent. `ignoreInTests` (default
// true) skips *.test / *.spec files.
// Left out: candidate for change (fires on a guess): a component the file
// cannot see (an import, a member such as `<Ctx.Provider>`); and the
// `detectExpensiveComputations` check, which calls a prop "expensive" from a
// count of calls, conditionals and loops near it (`minComputationComplexity`).
module react_render_optimization {
  type Receiver = Dom | CustomEl | MemoNamed | MemoDefault | MemoRenamed | MemoForwardRef
                | PureClass | PlainFn | PlainArrow | ForwardRef | PlainClass
  type Value = Obj | Arr | Arrow | FnExpr | CondFn | Ident | Str
  type Opts = Default | NoProps | NoFunctions
  type TestCtx = Prod | TestDefault | TestFlip

  pure def memoized(r: Receiver): bool =
    Set(MemoNamed, MemoDefault, MemoRenamed, MemoForwardRef, PureClass).contains(r)
  pure def flagged(v: Value, o: Opts): bool =
    if (Set(Obj, Arr).contains(v)) o != NoProps
    else if (Set(Arrow, FnExpr, CondFn).contains(v)) o != NoFunctions
    else false
  pure def reports(r: Receiver, v: Value, o: Opts, t: TestCtx): bool =
    t != TestDefault and memoized(r) and flagged(v, o)

  var receiver: Receiver
  var value: Value
  var opts: Opts
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet r = Set(Dom, CustomEl, MemoNamed, MemoDefault, MemoRenamed, MemoForwardRef,
                   PureClass, PlainFn, PlainArrow, ForwardRef, PlainClass).oneOf()
    nondet v = Set(Obj, Arr, Arrow, FnExpr, CondFn, Ident, Str).oneOf()
    nondet o = Set(Default, NoProps, NoFunctions).oneOf()
    nondet t = Set(Prod, TestDefault, TestFlip).oneOf()
    all { receiver' = r, value' = v, opts' = o, testCtx' = t,
          verdict' = reports(r, v, o, t) }
  }

  action init = step
}
