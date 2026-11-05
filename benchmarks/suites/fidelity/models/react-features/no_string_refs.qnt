// Model of eslint-plugin-react-features/no-string-refs.
// String refs are a legacy React API (removed in React 19). Reported:
//   - a `ref` whose value is provably a string, on any element (React handles
//     `ref` itself, so a component is no different): `ref="x"`, `ref={"x"}`,
//     a template literal (with or without placeholders: it is still a
//     string), or a conditional whose branches are both strings;
//   - reading `this.refs` (`this.refs.x`, `this['refs'].x`) in a class that
//     extends React's `Component` / `PureComponent`.
// Not reported: a ref object (`ref={this.inputRef}`), a callback ref, a value
// the file cannot know (`ref={value}`); another property of `this`, another
// object's `refs`, and `this.refs` in a class that is not a React component.
module no_string_refs {
  type Focus = Attr | Refs
  type Value = Lit | Braced | Template | TemplateExpr | Cond | Dynamic | RefObject | Callback
  type Elem = Intrinsic | Component_
  type Base = Named | Default | Plain | Foreign
  type Access = Dot | Computed | OtherProp | StoreRefs

  pure def isString(v: Value): bool =
    Set(Lit, Braced, Template, TemplateExpr, Cond).contains(v)
  pure def isComponent(b: Base): bool = b == Named or b == Default
  pure def reports(f: Focus, v: Value, b: Base, a: Access): bool =
    if (f == Attr) isString(v)
    else isComponent(b) and Set(Dot, Computed).contains(a)

  var focus: Focus
  var value: Value
  var elem: Elem
  var base: Base
  var access: Access
  var verdict: bool

  action step = {
    nondet f = Set(Attr, Refs).oneOf()
    nondet v = (if (f == Attr) Set(Lit, Braced, Template, TemplateExpr, Cond, Dynamic,
                                   RefObject, Callback)
                else Set(RefObject)).oneOf()
    nondet e = (if (f == Attr) Set(Intrinsic, Component_) else Set(Intrinsic)).oneOf()
    nondet b = (if (f == Refs) Set(Named, Default, Plain, Foreign) else Set(Named)).oneOf()
    nondet a = (if (f == Refs) Set(Dot, Computed, OtherProp, StoreRefs) else Set(Dot)).oneOf()
    all { focus' = f, value' = v, elem' = e, base' = b, access' = a,
          verdict' = reports(f, v, b, a) }
  }

  action init = step
}
