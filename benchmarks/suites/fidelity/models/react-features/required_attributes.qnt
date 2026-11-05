// Model of eslint-plugin-react-features/required-attributes.
// Nothing is required by default. With `attributes: [{ attribute }]` every
// JSX element — intrinsic, component or member — without that attribute is
// reported; the attribute written with any value (`"x"`, `{x}`) satisfies it.
// `ignoreTags` exempts the named tags for that attribute and
// `ignoreComponents` exempts the named elements for every attribute. A
// `Fragment` (`<Fragment>`, `<React.Fragment>`) accepts no attribute but
// `key`, so no attribute can be required of it.
// Left out: candidate for change (fires on a guess): an element with a
// spread (`{...rest}` may carry the attribute). Left out (judgment): the
// rule's built-in exemption of `type` / `name` on non-form elements.
module required_attributes {
  type Elem = Div | Comp | Member | FragNamed | FragMember
  type Opt = NoConfig | Require | RequireIgnoreTag | RequireIgnoreComp
  type Attr = Absent | Present | Braced

  pure def isFragment(e: Elem): bool = e == FragNamed or e == FragMember
  pure def exempt(e: Elem, o: Opt): bool =
    (o == RequireIgnoreTag and e == Div) or (o == RequireIgnoreComp and e == Comp)
  pure def reports(e: Elem, o: Opt, a: Attr): bool =
    o != NoConfig and a == Absent and not(isFragment(e)) and not(exempt(e, o))

  var elem: Elem
  var opt: Opt
  var attr: Attr
  var verdict: bool

  action step = {
    nondet e = Set(Div, Comp, Member, FragNamed, FragMember).oneOf()
    nondet o = Set(NoConfig, Require, RequireIgnoreTag, RequireIgnoreComp).oneOf()
    nondet a = Set(Absent, Present, Braced).oneOf()
    all { elem' = e, opt' = o, attr' = a, verdict' = reports(e, o, a) }
  }

  action init = step
}
