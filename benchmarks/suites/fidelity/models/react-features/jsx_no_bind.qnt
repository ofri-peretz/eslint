// Model of eslint-plugin-react-features/jsx-no-bind.
// A `.bind()` call written as a JSX prop value creates a new function on
// every render. Reported in every spelling of the call: `h.bind(this)`,
// `h['bind'](this)`, `h.bind?.(this)`, and as either branch of a conditional
// or the right of `&&`. On host elements and components alike.
// Silent: a function reference, another call, and an inline arrow (the
// rule's contract is `.bind()`; whether a fresh arrow matters depends on a
// memoized child the file cannot see, so it is a judgment call).
module jsx_no_bind {
  type Value = Dotted | Computed | Optional | Ternary | Logical | Arrow | Ref | OtherCall
  type Target = Intrinsic | Component

  pure def reports(v: Value): bool =
    Set(Dotted, Computed, Optional, Ternary, Logical).contains(v)

  var value: Value
  var target: Target
  var verdict: bool

  action step = {
    nondet v = Set(Dotted, Computed, Optional, Ternary, Logical, Arrow, Ref, OtherCall).oneOf()
    nondet t = Set(Intrinsic, Component).oneOf()
    all { value' = v, target' = t, verdict' = reports(v) }
  }

  action init = step
}
