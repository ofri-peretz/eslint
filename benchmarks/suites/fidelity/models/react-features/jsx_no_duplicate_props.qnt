// Model of eslint-plugin-react-features/jsx-no-duplicate-props.
// The same prop written twice on one element: the last value silently wins.
// Reported for a plain name and a namespaced one (`xlink:href` twice), with
// or without a spread between them, on host elements and components. Names
// that differ only in case (`onClick` / `onclick`) are distinct props unless
// `ignoreCase` is set.
module jsx_no_duplicate_props {
  type Pair = Same | CaseDiff | Different | Namespaced | NamespacedDiff
  type Spread = NoSpread | SpreadBetween
  type IgnoreCase = Default | IgnoreCaseOn
  type Target = Intrinsic | Component

  pure def reports(p: Pair, ic: IgnoreCase): bool =
    p == Same or p == Namespaced or (p == CaseDiff and ic == IgnoreCaseOn)

  var pair: Pair
  var spread: Spread
  var ignoreCase: IgnoreCase
  var target: Target
  var verdict: bool

  action step = {
    nondet p = Set(Same, CaseDiff, Different, Namespaced, NamespacedDiff).oneOf()
    nondet sp = Set(NoSpread, SpreadBetween).oneOf()
    nondet ic = Set(Default, IgnoreCaseOn).oneOf()
    nondet t = Set(Intrinsic, Component).oneOf()
    all { pair' = p, spread' = sp, ignoreCase' = ic, target' = t, verdict' = reports(p, ic) }
  }

  action init = step
}
