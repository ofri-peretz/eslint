// Model of eslint-plugin-react-features/jsx-max-depth.
// JSX nested more than `max` levels deep (default 5) is reported: the root
// element is depth 0 and every element nested in it one level deeper. A
// fragment (`<>...</>`) is a level like any element, and an element written
// in a child expression under `&&` or a conditional (`{flag && <div/>}`,
// `{flag ? <div/> : null}`) is nested where it is written.
// Judgment call (not modelled): an element returned from a callback inside
// the tree (`{items.map(i => <li/>)}`) crosses a function boundary.
module jsx_max_depth {
  type Wrapper = Plain | Fragment | Logical | Ternary
  type Max = DefaultMax | Max2

  pure def limit(m: Max): int = if (m == DefaultMax) 5 else 2
  // `levels` elements in one chain: the deepest is at depth levels - 1.
  pure def reports(levels: int, m: Max): bool = levels - 1 > limit(m)

  var levels: int
  var wrapper: Wrapper
  var max: Max
  var verdict: bool

  action step = {
    nondet n = 1.to(8).oneOf()
    nondet w = (if (n == 1) Set(Plain) else Set(Plain, Fragment, Logical, Ternary)).oneOf()
    nondet m = Set(DefaultMax, Max2).oneOf()
    all { levels' = n, wrapper' = w, max' = m, verdict' = reports(n, m) }
  }

  action init = step
}
