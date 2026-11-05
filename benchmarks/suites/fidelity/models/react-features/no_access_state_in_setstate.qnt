// Model of eslint-plugin-react-features/no-access-state-in-setstate.
// React batches `this.setState` updates, so the state object passed to it
// must not be computed from `this.state`, which may be stale: use the updater
// form's `prevState`. Reported when the first argument of a component's
// `this.setState(...)` / `this['setState'](...)` reads `this.state` (also as
// `this['state']`, also inside an updater function), or reads a local the
// same function destructured or assigned from `this.state`. Silent: the
// updater's own `prevState`, values not derived from `this.state`, the
// second (after-update callback) argument, and `setState` on another object
// (`store.setState(...)` is not the component's).
module no_access_state_in_setstate {
  type Receiver = This | Other
  type Arg = DirectState | ComputedState | UpdaterReadsState | UpdaterPrev | NoState
           | LocalFromState | LocalUnrelated | CallbackReadsState
  type Callee = Dotted | ComputedCallee

  pure def reports(r: Receiver, a: Arg): bool =
    r == This and Set(DirectState, ComputedState, UpdaterReadsState, LocalFromState).contains(a)

  var receiver: Receiver
  var arg: Arg
  var callee: Callee
  var verdict: bool

  action step = {
    nondet r = Set(This, Other).oneOf()
    nondet a = Set(DirectState, ComputedState, UpdaterReadsState, UpdaterPrev, NoState,
                   LocalFromState, LocalUnrelated, CallbackReadsState).oneOf()
    nondet c = Set(Dotted, ComputedCallee).oneOf()
    all { receiver' = r, arg' = a, callee' = c, verdict' = reports(r, a) }
  }

  action init = step
}
