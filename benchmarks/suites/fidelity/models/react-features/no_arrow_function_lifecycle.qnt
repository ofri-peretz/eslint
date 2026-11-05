// Model of eslint-plugin-react-features/no-arrow-function-lifecycle.
// In a React class component (one extending React's `Component` or
// `PureComponent`, by binding), a lifecycle method React calls
// (`componentDidMount`, ..., the static `getDerivedStateFromProps`) written as
// an arrow-function class field is an instance property, not a prototype
// method: reported, whatever spelling the key uses (`componentDidMount`,
// `'componentDidMount'`, `['componentDidMount']`). A regular method, an arrow
// event handler, and a class that is not a React component (a plain class, a
// local `Component`, `Component` from another library) are not reported.
// Left out: an undeclared bare `Component` superclass (read by name).
module no_arrow_function_lifecycle {
  type Base = Default | Named | Pure | Renamed | Namespace | Shadowed | Foreign | NoExtends
  type Key = Ident | Quoted | Computed
  type Method = Lifecycle | StaticLifecycle | Handler
  type Form = Arrow | MethodDef

  pure def isReact(b: Base): bool = not(Set(Shadowed, Foreign, NoExtends).contains(b))
  pure def reports(b: Base, m: Method, f: Form): bool =
    isReact(b) and m != Handler and f == Arrow

  var base: Base
  var key: Key
  var method: Method
  var form: Form
  var verdict: bool

  action step = {
    nondet b = Set(Default, Named, Pure, Renamed, Namespace, Shadowed, Foreign, NoExtends).oneOf()
    nondet k = Set(Ident, Quoted, Computed).oneOf()
    nondet m = Set(Lifecycle, StaticLifecycle, Handler).oneOf()
    nondet f = Set(Arrow, MethodDef).oneOf()
    all { base' = b, key' = k, method' = m, form' = f, verdict' = reports(b, m, f) }
  }

  action init = step
}
