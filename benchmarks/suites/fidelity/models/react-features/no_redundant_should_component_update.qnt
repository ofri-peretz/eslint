// Model of eslint-plugin-react-features/no-redundant-should-component-update.
// A `shouldComponentUpdate` that always returns `true` is React's default
// behaviour, so it is dead code. Reported: on a class that extends React's
// `Component` / `PureComponent` (any spelling of the import), a
// `shouldComponentUpdate` whose every return is `true` — `return true;` in a
// method or a quoted-key method, or an arrow property `() => true`.
// Not reported: a real comparison, a guarded `return false` before
// `return true`, `return false`; the same method on a class that is not a
// React component.
// Left out (judgment): a non-trivial `shouldComponentUpdate` on a
// `PureComponent` (React warns about any; the docs' contract is "always
// true").
module no_redundant_should_component_update {
  type Base = Named | Renamed | Default | Namespace | Pure | Plain | Foreign
  type Body = ReturnTrue | ArrowTrue | QuotedTrue | Compare | GuardedTrue | ReturnFalse

  pure def isComponent(b: Base): bool = not(Set(Plain, Foreign).contains(b))
  pure def reports(b: Base, d: Body): bool =
    isComponent(b) and Set(ReturnTrue, ArrowTrue, QuotedTrue).contains(d)

  var base: Base
  var body: Body
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Pure, Plain, Foreign).oneOf()
    nondet d = (if (b == Pure) Set(ReturnTrue, ArrowTrue, QuotedTrue)
                else Set(ReturnTrue, ArrowTrue, QuotedTrue, Compare, GuardedTrue,
                         ReturnFalse)).oneOf()
    all { base' = b, body' = d, verdict' = reports(b, d) }
  }

  action init = step
}
