// Model of eslint-plugin-react-features/jsx-uses-react.
// The rule marks the JSX factory (`React`, a `@jsx` pragma, or the configured
// pragma) as used, so the core `no-unused-vars` rule leaves it alone. Its own
// effect is on that rule; it reports nothing itself, whatever the JSX or the
// pragma.
module jsx_uses_react {
  type Shape = Element | Fragment | Nested
  type Pragma = Default | JsxComment

  pure def reports(s: Shape, p: Pragma): bool = false

  var shape: Shape
  var pragma: Pragma
  var verdict: bool

  action step = {
    nondet s = Set(Element, Fragment, Nested).oneOf()
    nondet p = Set(Default, JsxComment).oneOf()
    all { shape' = s, pragma' = p, verdict' = reports(s, p) }
  }

  action init = step
}
