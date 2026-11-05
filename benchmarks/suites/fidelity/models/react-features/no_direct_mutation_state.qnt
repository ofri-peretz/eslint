// Model of eslint-plugin-react-features/no-direct-mutation-state.
// Writing to `this.state` of a React class component bypasses `setState`: no
// re-render, and the write is lost on the next update. Reported, on a class
// that extends React's `Component` / `PureComponent` (any spelling of the
// import): assigning a state key (`this.state.count = 1`, also through
// `this['state']`, a nested key, `+=`, `++`, `delete`) or replacing
// `this.state` — anywhere but the constructor, where the initial state is set.
// With `allowInLifecycleMethods: true`, writes in a lifecycle method
// (`componentDidMount`) are not reported.
// Not reported: reading state, `this.setState(…)`, any write in the
// constructor, and writes on a class that is not a React component.
// Left out (judgment): mutating calls on a state value
// (`this.state.items.push(x)`), which the docs list but which the rule can
// only recognise by the method's name.
module no_direct_mutation_state {
  type Base = Named | Renamed | Default | Namespace | Pure | Plain | Foreign
  type Mutation = AssignKey | Compound | Update | Delete | Nested | ComputedState
                | ReplaceState | Read | SetState
  type Where = Constructor | Handler | Method_ | Lifecycle | Callback
  type Opt = Default_ | AllowInLifecycle

  pure def isComponent(b: Base): bool = not(Set(Plain, Foreign).contains(b))
  pure def writes(m: Mutation): bool = not(Set(Read, SetState).contains(m))
  pure def allowedPlace(w: Where, o: Opt): bool =
    w == Constructor or (w == Lifecycle and o == AllowInLifecycle)
  pure def reports(b: Base, m: Mutation, w: Where, o: Opt): bool =
    isComponent(b) and writes(m) and not(allowedPlace(w, o))

  var base: Base
  var mutation: Mutation
  var where: Where
  var opt: Opt
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Pure, Plain, Foreign).oneOf()
    // The base-class spellings are crossed with one write in a handler only.
    nondet m = (if (b == Named) Set(AssignKey, Compound, Update, Delete, Nested,
                                    ComputedState, ReplaceState, Read, SetState)
                else Set(AssignKey)).oneOf()
    nondet w = (if (b == Named) Set(Constructor, Handler, Method_, Lifecycle, Callback)
                else Set(Handler)).oneOf()
    nondet o = (if (b == Named) Set(Default_, AllowInLifecycle) else Set(Default_)).oneOf()
    all { base' = b, mutation' = m, where' = w, opt' = o, verdict' = reports(b, m, w, o) }
  }

  action init = step
}
