// Model of eslint-plugin-react-features/jsx-handler-names.
// A naming convention, so names are its subject: a function passed by name
// to an event prop (`on` + an uppercase letter, React's event-prop shape:
// `onClick`, `onClose` on a component) should be named `handle...` or
// `on...`. Reported: `onClick={clickHandler}`. Not judged: a prop that is not
// an event prop (`only={items}`, `on={x}`), `{undefined}` (no handler at
// all), an inline function, a call, a member expression (the doc checks only
// a plain identifier).
module jsx_handler_names {
  type Prop = PropOn | PropOnComp | PropNotEvent | PropBareOn
  type Value = HandleName | OnName | Other | Undefined | Member | Inline | Call

  pure def reports(p: Prop, v: Value): bool =
    (p == PropOn or p == PropOnComp) and v == Other

  var prop: Prop
  var value: Value
  var verdict: bool

  action step = {
    nondet p = Set(PropOn, PropOnComp, PropNotEvent, PropBareOn).oneOf()
    nondet v = Set(HandleName, OnName, Other, Undefined, Member, Inline, Call).oneOf()
    all { prop' = p, value' = v, verdict' = reports(p, v) }
  }

  action init = step
}
