// Model of eslint-plugin-react-features/no-multi-comp.
// One component per file. Reported: a file that defines a second component.
// A component, as React defines one: a class that extends React's
// `Component` / `PureComponent`, a PascalCase function (declaration or arrow)
// that returns JSX, or a function passed to React's `memo` / `forwardRef`.
// With `ignoreStateless: true`, function components do not count, so only a
// second class component is reported.
// Not reported: one component and a lowercase helper that returns JSX, a
// PascalCase function that returns no JSX, a class that is not a component,
// or nothing else.
module no_multi_comp {
  type First = FClass | FFn
  type Second = Class | FnDecl | Arrow | Memo | ForwardRef | Helper | Util | PlainClass | None
  type Opt = Default_ | IgnoreStateless

  pure def isComp(s: Second): bool = Set(Class, FnDecl, Arrow, Memo, ForwardRef).contains(s)
  pure def counts(isClass: bool, o: Opt): bool = isClass or o == Default_
  pure def reports(f: First, s: Second, o: Opt): bool =
    isComp(s) and counts(f == FClass, o) and counts(s == Class, o)

  var first: First
  var second: Second
  var opt: Opt
  var verdict: bool

  action step = {
    nondet f = Set(FClass, FFn).oneOf()
    nondet s = Set(Class, FnDecl, Arrow, Memo, ForwardRef, Helper, Util, PlainClass,
                   None).oneOf()
    nondet o = Set(Default_, IgnoreStateless).oneOf()
    all { first' = f, second' = s, opt' = o, verdict' = reports(f, s, o) }
  }

  action init = step
}
