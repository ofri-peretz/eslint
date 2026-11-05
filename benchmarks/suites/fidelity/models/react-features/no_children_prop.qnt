// Model of eslint-plugin-react-features/no-children-prop.
// `children` passed as a prop instead of nested: `children={...}` on an
// element or component, a `children` key in a spread object literal (plain,
// quoted, computed `['children']` or shorthand), and a `children` key in the
// props object of React's `createElement` (by binding: `React.createElement`,
// a named import). Silent: nested children, another prop, and a local
// function that happens to be called `createElement`.
module no_children_prop {
  type Form = Attr | AttrComponent | SpreadIdent | SpreadQuoted | SpreadComputed | SpreadShorthand
            | CreateElementMember | CreateElementNamed | CreateElementLocal | Nested | OtherProp

  pure def reports(f: Form): bool = not(Set(CreateElementLocal, Nested, OtherProp).contains(f))

  var form: Form
  var verdict: bool

  action step = {
    nondet f = Set(Attr, AttrComponent, SpreadIdent, SpreadQuoted, SpreadComputed, SpreadShorthand,
                   CreateElementMember, CreateElementNamed, CreateElementLocal, Nested, OtherProp).oneOf()
    all { form' = f, verdict' = reports(f) }
  }

  action init = step
}
