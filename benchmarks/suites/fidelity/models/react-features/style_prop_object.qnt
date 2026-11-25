// Model of eslint-plugin-react-features/style-prop-object.
// React's `style` prop takes an object. Reported: a `style` that is a string,
// number or boolean written in place, or an identifier that a `const` in the
// file binds to one, on a JSX attribute or in the props object of
// `React.createElement`. Not reported: an object, `null`, a value the rule
// cannot trace (a prop, a template literal), or any `style` on a component
// named in the `allow` option.
module style_prop_object {
  type Carrier = Jsx | CreateElement
  type Value = StringLit | NumberLit | ObjectLit | NullLit | ConstString | ConstObject | Unresolved | Template
  type Allow = NoAllow | Allowed

  pure def isPrimitive(v: Value): bool =
    Set(StringLit, NumberLit, ConstString).contains(v)
  pure def reports(v: Value, a: Allow): bool = isPrimitive(v) and a == NoAllow

  var carrier: Carrier
  var value: Value
  var allow: Allow
  var verdict: bool

  action step = {
    nondet c = Set(Jsx, CreateElement).oneOf()
    nondet v = Set(StringLit, NumberLit, ObjectLit, NullLit, ConstString, ConstObject, Unresolved, Template).oneOf()
    nondet a = Set(NoAllow, Allowed).oneOf()
    all { carrier' = c, value' = v, allow' = a, verdict' = reports(v, a) }
  }

  action init = step
}
