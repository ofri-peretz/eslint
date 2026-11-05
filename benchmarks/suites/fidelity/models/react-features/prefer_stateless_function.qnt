// Model of eslint-plugin-react-features/prefer-stateless-function.
// A React class component (extends React's `Component` / `PureComponent` by
// binding, declared or as a class expression) is reported when a function
// component could say exactly the same thing: its members are only `render`,
// the statics React reads (`propTypes`, `defaultProps`, `contextTypes`,
// `contextType`, `displayName`) and at most a constructor that only calls
// `super(props)`, and it reads `this` only as `this.props` / `this.context`.
// Silent: state (a field, `this.state =`, `setState`), any lifecycle (method or
// arrow field), any other instance method or field (handlers, refs), and an
// error boundary (`getDerivedStateFromError` / `componentDidCatch` have no
// function equivalent). With `ignorePureComponents: true` a `PureComponent`
// is silent too. A class that is not a React component is silent.
// Left out: a class extending an undeclared bare `Component`.
module prefer_stateless_function {
  type Body = RenderOnly | StaticProps | ContextUse | UselessCtor | StateField | SetState
            | Lifecycle | ArrowLifecycle | Handler | RefField | ErrorBoundary
  type Super = Default | Pure | Renamed | Namespace | Foreign | NoSuper
  type ClassForm = Decl | Expr
  type Opt = Defaults | IgnorePure

  pure def isReact(s: Super): bool = Set(Default, Pure, Renamed, Namespace).contains(s)
  pure def stateless(b: Body): bool = Set(RenderOnly, StaticProps, ContextUse, UselessCtor).contains(b)
  pure def reports(b: Body, s: Super, o: Opt): bool =
    isReact(s) and stateless(b) and not(o == IgnorePure and s == Pure)

  var body: Body
  var sup: Super
  var classForm: ClassForm
  var opt: Opt
  var verdict: bool

  action step = {
    nondet b = Set(RenderOnly, StaticProps, ContextUse, UselessCtor, StateField, SetState,
                   Lifecycle, ArrowLifecycle, Handler, RefField, ErrorBoundary).oneOf()
    nondet s = Set(Default, Pure, Renamed, Namespace, Foreign, NoSuper).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    nondet o = Set(Defaults, IgnorePure).oneOf()
    all { body' = b, sup' = s, classForm' = c, opt' = o, verdict' = reports(b, s, o) }
  }

  action init = step
}
