// Model of eslint-plugin-react-features/checked-requires-onchange-or-readonly.
// React's controlled-input contract: a form field given `value` (or an
// `<input>` given `checked`) is controlled, and without `onChange` React
// renders it read-only and warns. The warning is withheld (React's own
// checkControlledValueProps) when the field has `onChange`, `readOnly` or
// `disabled` set truthy, when the value is `undefined` (uncontrolled), and for
// `value` on an input whose type never edits its value (checkbox, radio,
// hidden, submit, ...). `defaultValue` is uncontrolled. `readOnly={false}` /
// `disabled={false}` are not set. Only the host `<input>` / `<textarea>` /
// `<select>` are judged: a component's props may never reach the DOM.
// Judgment call (silent): `onInput` instead of `onChange` keeps the field
// editable in the browser.
// Left out: candidate for change (fires on a guess): `<input value={v} {...rest} />`,
// where the spread may carry `onChange` or `readOnly`.
module checked_requires_onchange_or_readonly {
  type Elem = Input | Textarea | Select | Comp
  type Ctrl = Checked | Value | ValueUndef | DefaultValue | NoCtrl
  type InputType = NoType | Checkbox | Hidden
  type Handler = NoHandler | OnChange | OnInput | ReadOnly | ReadOnlyFalse | Disabled | DisabledFalse

  pure def controlled(c: Ctrl): bool = c == Checked or c == Value
  pure def exempt(h: Handler): bool = Set(OnChange, OnInput, ReadOnly, Disabled).contains(h)
  pure def reports(e: Elem, c: Ctrl, t: InputType, h: Handler): bool =
    e != Comp and controlled(c) and not(exempt(h))
      and not(c == Value and t != NoType)

  var elem: Elem
  var ctrl: Ctrl
  var inputType: InputType
  var handler: Handler
  var verdict: bool

  action step = {
    nondet e = Set(Input, Textarea, Select, Comp).oneOf()
    nondet c = (if (e == Input) Set(Checked, Value, ValueUndef, DefaultValue, NoCtrl)
                else Set(Value, ValueUndef, DefaultValue, NoCtrl)).oneOf()
    nondet t = (if (e == Input) Set(NoType, Checkbox, Hidden) else Set(NoType)).oneOf()
    nondet h = Set(NoHandler, OnChange, OnInput, ReadOnly, ReadOnlyFalse, Disabled, DisabledFalse).oneOf()
    all { elem' = e, ctrl' = c, inputType' = t, handler' = h, verdict' = reports(e, c, t, h) }
  }

  action init = step
}
