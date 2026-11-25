// Model of eslint-plugin-react-a11y/accessible-emoji.
// A deprecated no-op kept so a config naming eslint-plugin-jsx-a11y's
// `accessible-emoji` loads. Upstream asked for an emoji to sit in a `span` with
// `role="img"` and an `aria-label`; that rule is deprecated there, and this one
// reports nothing, whatever the JSX.
module accessible_emoji {
  type Shape = BareEmoji | LabelledEmoji | NoEmoji

  pure def reports(s: Shape): bool = false

  var shape: Shape
  var verdict: bool

  action step = {
    nondet s = Set(BareEmoji, LabelledEmoji, NoEmoji).oneOf()
    all { shape' = s, verdict' = reports(s) }
  }

  action init = step
}
