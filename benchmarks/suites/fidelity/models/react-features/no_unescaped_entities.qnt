// Model of eslint-plugin-react-features/no-unescaped-entities.
// A raw `"` in JSX text is reported: in markup it reads as an attribute
// delimiter that was never closed. (`>` and `}` in JSX text do not parse in
// TypeScript, so they never reach the rule here.) The escaped spellings —
// `&quot;`, `&#34;`, `{'"'}` — and a quote inside an attribute string or a
// string expression are not findings: the source already says what it means.
// Text with no special character is silent.
// Left out (judgment): `'` (an apostrophe in prose renders as written and is
// ubiquitous; the docs no longer list it).
module no_unescaped_entities {
  type Char = Quote | EscQuot | NumQuot | BracedQuote | EscGt | Plain
  type Place = InText | InAttr

  pure def reports(c: Char, p: Place): bool = c == Quote and p == InText

  var char: Char
  var place: Place
  var verdict: bool

  action step = {
    nondet c = Set(Quote, EscQuot, NumQuot, BracedQuote, EscGt, Plain).oneOf()
    nondet p = Set(InText, InAttr).oneOf()
    all { char' = c, place' = p, verdict' = reports(c, p) }
  }

  action init = step
}
