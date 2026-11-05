// Model of eslint-plugin-react-features/no-set-state.
// The rule flags every use of class-component state updates, to steer code to
// `useState`. Reported: a React class component calling its own setState —
// `this.setState(…)` / `this['setState'](…)` — anywhere in a method, an arrow
// property or a quoted-key method, directly, under a condition, or in a
// callback that keeps the component's `this` (an arrow, a `.bind(this)`
// function), on a class that extends React's `Component` / `PureComponent`
// (any spelling of the import).
// Not reported: another method call, `store.setState(…)` (another object's
// state), and a class that is not a React component (no base class, or a
// `Component` imported from another library).
module no_set_state {
  type Base = Named | Renamed | Default | Namespace | Pure | Plain | Foreign
  type Where = Direct | InIf | InArrow | InFunction
  type Form = Method_ | ArrowProp | Quoted
  type Call = SetState | Computed | Other | Store

  pure def isComponent(b: Base): bool = not(Set(Plain, Foreign).contains(b))
  pure def reports(b: Base, c: Call): bool =
    isComponent(b) and Set(SetState, Computed).contains(c)

  var base: Base
  var where: Where
  var form: Form
  var call: Call
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Pure, Plain, Foreign).oneOf()
    nondet w = Set(Direct, InIf, InArrow, InFunction).oneOf()
    // The base-class spellings are crossed with the plain method and call only.
    nondet f = (if (b == Named) Set(Method_, ArrowProp, Quoted) else Set(Method_)).oneOf()
    nondet c = (if (b == Named) Set(SetState, Computed, Other, Store) else Set(SetState)).oneOf()
    all { base' = b, where' = w, form' = f, call' = c, verdict' = reports(b, c) }
  }

  action init = step
}
