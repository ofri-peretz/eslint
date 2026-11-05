// Model of eslint-plugin-react-features/no-did-mount-set-state.
// Calling `this.setState` synchronously in `componentDidMount` of a React
// class component forces a second render before the browser paints. Reported:
// a `this.setState(…)` / `this['setState'](…)` call that runs as the method
// runs — at the top, under an `if`, or in a `&&` — when the method is declared
// as a method, an arrow property or a quoted key, on a class that extends
// React's `Component` / `PureComponent` (any spelling of the import).
// Not reported: setState inside a callback (`load().then(() => …)`, a
// `function` passed to `setTimeout`), which runs later (the data-loading
// pattern React documents); another method call; setState in another
// lifecycle; `store.setState(…)` (another object's state); a class that is
// not a React component.
module no_did_mount_set_state {
  type Base = Named | Renamed | Default | Namespace | Pure | Plain | Foreign
  type Where = Direct | InIf | InLogical | InArrow | InFunction
  type Form = Method_ | ArrowProp | Quoted
  type Call = SetState | Computed | Other | Store
  type Method = DidMount | DidUpdate

  pure def isComponent(b: Base): bool = not(Set(Plain, Foreign).contains(b))
  pure def reports(b: Base, w: Where, c: Call, m: Method): bool =
    isComponent(b) and Set(SetState, Computed).contains(c) and m == DidMount
      and Set(Direct, InIf, InLogical).contains(w)

  var base: Base
  var where: Where
  var form: Form
  var call: Call
  var method: Method
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Pure, Plain, Foreign).oneOf()
    nondet w = Set(Direct, InIf, InLogical, InArrow, InFunction).oneOf()
    // The base-class spellings are crossed with the plain method and call only.
    nondet f = (if (b == Named) Set(Method_, ArrowProp, Quoted) else Set(Method_)).oneOf()
    nondet c = (if (b == Named) Set(SetState, Computed, Other, Store) else Set(SetState)).oneOf()
    nondet m = Set(DidMount, DidUpdate).oneOf()
    all { base' = b, where' = w, form' = f, call' = c, method' = m,
          verdict' = reports(b, w, c, m) }
  }

  action init = step
}
