// Model of eslint-plugin-react-a11y/no-onchange.
// A deprecated no-op kept so a config naming eslint-plugin-jsx-a11y's
// `no-onchange` loads. Upstream asked for `onBlur` instead of `onChange` on a
// select; that rule is deprecated there, and this one reports nothing, whatever
// the handler.
module no_onchange {
  type Shape = SelectOnChange | SelectOnBlur | InputOnChange

  pure def reports(s: Shape): bool = false

  var shape: Shape
  var verdict: bool

  action step = {
    nondet s = Set(SelectOnChange, SelectOnBlur, InputOnChange).oneOf()
    all { shape' = s, verdict' = reports(s) }
  }

  action init = step
}
