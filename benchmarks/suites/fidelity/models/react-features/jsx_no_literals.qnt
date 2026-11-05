// Model of eslint-plugin-react-features/jsx-no-literals.
// A style rule (i18n): with `noStrings` (default on), a string written
// literally as JSX content is reported: text (`<p>Hello</p>`), a braced
// string (`{'Hello'}`) or a template with no placeholders (`` {`Hello`} ``).
// With `ignoreProps: false` a literal prop value is reported the same way
// (`title="Hello"`, `title={'Hello'}`). A string listed in `allowedStrings`
// (compared trimmed), whitespace-only text and a dynamic value are not.
// `noStrings: false` turns the rule off, as the doc's flowchart states.
module jsx_no_literals {
  type Position = Text | Braced | Template | Whitespace | Prop | PropBraced | Dynamic
  type Allowed = NotAllowed | AllowedString
  type NoStrings = NoStringsDefault | NoStringsOff
  type IgnoreProps = IgnorePropsDefault | IgnorePropsOff

  pure def reports(p: Position, a: Allowed, n: NoStrings, ip: IgnoreProps): bool =
    n == NoStringsDefault and a == NotAllowed and
      (Set(Text, Braced, Template).contains(p)
        or (Set(Prop, PropBraced).contains(p) and ip == IgnorePropsOff))

  var position: Position
  var allowed: Allowed
  var noStrings: NoStrings
  var ignoreProps: IgnoreProps
  var verdict: bool

  action step = {
    nondet p = Set(Text, Braced, Template, Whitespace, Prop, PropBraced, Dynamic).oneOf()
    nondet a = Set(NotAllowed, AllowedString).oneOf()
    nondet n = Set(NoStringsDefault, NoStringsOff).oneOf()
    nondet ip = Set(IgnorePropsDefault, IgnorePropsOff).oneOf()
    all { position' = p, allowed' = a, noStrings' = n, ignoreProps' = ip,
          verdict' = reports(p, a, n, ip) }
  }

  action init = step
}
