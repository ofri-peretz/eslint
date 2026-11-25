// Model of eslint-plugin-react-a11y/label-has-for.
// A deprecated no-op kept so a config naming eslint-plugin-jsx-a11y's
// `label-has-for` loads. Upstream replaced it with `label-has-associated-control`
// (this plugin's rule of that name does the checking). This one reports nothing,
// whatever the label.
module label_has_for {
  type Shape = BareLabel | NestedControl | HtmlFor

  pure def reports(s: Shape): bool = false

  var shape: Shape
  var verdict: bool

  action step = {
    nondet s = Set(BareLabel, NestedControl, HtmlFor).oneOf()
    all { shape' = s, verdict' = reports(s) }
  }

  action init = step
}
