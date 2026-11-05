// Model of eslint-plugin-react-features/static-property-placement.
// In a React class component (by binding, declared or as a class expression)
// the statics of one property group must sit together: a group that resumes
// after a static of a DIFFERENT group came between is reported. Default
// groups: propTypes / defaultProps / childContextTypes / contextTypes /
// contextType, and getDerivedStateFromProps / getDerivedStateFromError. A
// static in no group and an instance member never break a group. A static
// name is read in every spelling (`static ['defaultProps']`). The
// `propertyGroups` option replaces the default groups.
// Left out: `childClass` (documented as having no effect), and a class
// extending an undeclared bare `Component`.
module static_property_placement {
  type Slot = PropTypes | DefaultPropsComputed | Gdsfp | DisplayName | Instance
  type Group = GA | GB | NoGroup
  type Super = Renamed | Foreign
  type ClassForm = Decl | Expr
  type Opt = Defaults | Custom

  // Default: A = {propTypes, defaultProps}, B = {getDerivedStateFromProps}.
  // Custom:  A = {propTypes, displayName}, B = {defaultProps, getDerivedStateFromProps}.
  pure def grp(s: Slot, o: Opt): Group =
    if (s == Instance) NoGroup
    else if (s == PropTypes) GA
    else if (s == Gdsfp) GB
    else if (s == DefaultPropsComputed) (if (o == Defaults) GA else GB)
    else (if (o == Defaults) NoGroup else GA)

  pure def broken(a: Group, b: Group, c: Group): bool =
    a != NoGroup and c == a and b != NoGroup and b != a

  pure def reports(x: Slot, y: Slot, z: Slot, s: Super, o: Opt): bool =
    s != Foreign and broken(grp(x, o), grp(y, o), grp(z, o))

  var first: Slot
  var second: Slot
  var third: Slot
  var sup: Super
  var classForm: ClassForm
  var opt: Opt
  var verdict: bool

  action step = {
    nondet x = Set(PropTypes, DefaultPropsComputed, Gdsfp, DisplayName, Instance).oneOf()
    nondet y = Set(PropTypes, DefaultPropsComputed, Gdsfp, DisplayName, Instance).oneOf()
    nondet z = Set(PropTypes, DefaultPropsComputed, Gdsfp, DisplayName, Instance).oneOf()
    nondet s = Set(Renamed, Foreign).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    nondet o = Set(Defaults, Custom).oneOf()
    all { first' = x, second' = y, third' = z, sup' = s, classForm' = c, opt' = o,
          verdict' = reports(x, y, z, s, o) }
  }

  action init = step
}
