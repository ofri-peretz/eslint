// Model of eslint-plugin-react-features/forbid-foreign-prop-types.
// Reading another component's `propTypes` is unsafe: production builds strip
// them. Reported: a read of `.propTypes` (dotted or bracketed) and a
// destructured `propTypes` key. Not reported: a component writing its own
// `X.propTypes = ...`, another property of the same object, a differently
// named property. With `allowInPropTypes`, a read that sits inside a
// `propTypes` assignment or a `static propTypes` class field is accepted.
module forbid_foreign_prop_types {
  type Site = DotRead | BracketRead | Destructure | OwnAssign | InsideAssign | InsideStaticField | OtherProperty | LookAlike
  type Allow = Default | AllowInPropTypes

  pure def insideDeclaration(s: Site): bool =
    s == InsideAssign or s == InsideStaticField

  pure def reports(s: Site, a: Allow): bool =
    if (Set(DotRead, BracketRead, Destructure).contains(s)) true
    else if (insideDeclaration(s)) a == Default
    else false

  var site: Site
  var allow: Allow
  var verdict: bool

  action step = {
    nondet s = Set(DotRead, BracketRead, Destructure, OwnAssign, InsideAssign, InsideStaticField, OtherProperty, LookAlike).oneOf()
    nondet a = Set(Default, AllowInPropTypes).oneOf()
    all { site' = s, allow' = a, verdict' = reports(s, a) }
  }

  action init = step
}
