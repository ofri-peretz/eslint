// Model of eslint-plugin-react-features/jsx-uses-vars.
// The rule marks every variable used as a JSX tag name as used, so the core
// `no-unused-vars` rule leaves a component imported only for its tag alone. Its
// own effect is on that rule; it reports nothing itself, whatever the tag.
module jsx_uses_vars {
  type Tag = Component | Member | Intrinsic | Namespaced

  pure def reports(t: Tag): bool = false

  var tagKind: Tag
  var verdict: bool

  action step = {
    nondet t = Set(Component, Member, Intrinsic, Namespaced).oneOf()
    all { tagKind' = t, verdict' = reports(t) }
  }

  action init = step
}
