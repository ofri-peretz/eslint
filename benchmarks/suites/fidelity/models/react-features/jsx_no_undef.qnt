// Model of eslint-plugin-react-features/jsx-no-undef.
// A JSX tag compiles to a reference to the name it begins with, so a tag whose
// name nothing declares is a ReferenceError at render time. Reported: `<Card />`
// and `<Ui.Card />` (the leftmost name) with no import or declaration for it.
// Not reported: an intrinsic element (`<div />`), a namespaced tag
// (`<svg:circle />`), a name the file imports or declares. `allowGlobals` only
// widens what counts as declared to the configured globals, and none is set here.
module jsx_no_undef {
  type Tag = Intrinsic | Imported | Local | Undeclared | MemberDeclared | MemberUndeclared | Namespaced
  type Globals = Default | AllowGlobals

  pure def reports(t: Tag): bool = t == Undeclared or t == MemberUndeclared

  var tagKind: Tag
  var globals: Globals
  var verdict: bool

  action step = {
    nondet t = Set(Intrinsic, Imported, Local, Undeclared, MemberDeclared, MemberUndeclared, Namespaced).oneOf()
    nondet g = Set(Default, AllowGlobals).oneOf()
    all { tagKind' = t, globals' = g, verdict' = reports(t) }
  }

  action init = step
}
