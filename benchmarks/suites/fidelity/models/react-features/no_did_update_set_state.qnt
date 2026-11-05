// Model of eslint-plugin-react-features/no-did-update-set-state.
// `componentDidUpdate` runs after every update, so an unconditional
// `this.setState` in it updates again, forever. Reported: a
// `this.setState(…)` / `this['setState'](…)` call in `componentDidUpdate`
// (method, arrow property or quoted key) of a class that extends React's
// `Component` / `PureComponent` (any spelling of the import), when nothing
// guards it — at the top of the method, or inside a callback the method
// starts unconditionally (`load().then(() => …)`, a `function` passed to
// `setTimeout`): those also loop, one update later. With
// `allowInCallback: true`, a call inside a callback is not reported.
// Not reported: a call under a condition (`if (prev.id !== this.props.id)`,
// `cond && …`), the guard the docs prescribe; another method call; setState in
// another lifecycle; `store.setState(…)` (another object's state); a class
// that is not a React component.
module no_did_update_set_state {
  type Base = Named | Renamed | Default | Namespace | Pure | Plain | Foreign
  type Where = Direct | InIf | InLogical | InArrow | InFunction
  type Form = Method_ | ArrowProp | Quoted
  type Call = SetState | Computed | Other | Store
  type Method = DidMount | DidUpdate
  type Opt = Default_ | AllowInCallback

  pure def isComponent(b: Base): bool = not(Set(Plain, Foreign).contains(b))
  pure def unguarded(w: Where, o: Opt): bool =
    w == Direct or (Set(InArrow, InFunction).contains(w) and o == Default_)
  pure def reports(b: Base, w: Where, c: Call, m: Method, o: Opt): bool =
    isComponent(b) and Set(SetState, Computed).contains(c) and m == DidUpdate and unguarded(w, o)

  var base: Base
  var where: Where
  var form: Form
  var call: Call
  var method: Method
  var opt: Opt
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Pure, Plain, Foreign).oneOf()
    nondet w = Set(Direct, InIf, InLogical, InArrow, InFunction).oneOf()
    // The base-class spellings are crossed with the plain method and call only.
    nondet f = (if (b == Named) Set(Method_, ArrowProp, Quoted) else Set(Method_)).oneOf()
    nondet c = (if (b == Named) Set(SetState, Computed, Other, Store) else Set(SetState)).oneOf()
    nondet m = Set(DidMount, DidUpdate).oneOf()
    nondet o = Set(Default_, AllowInCallback).oneOf()
    all { base' = b, where' = w, form' = f, call' = c, method' = m, opt' = o,
          verdict' = reports(b, w, c, m, o) }
  }

  action init = step
}
