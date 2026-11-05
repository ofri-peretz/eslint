// Model of eslint-plugin-react-a11y/anchor-ambiguous-text (WCAG 2.4.4 Link
// Purpose). A link whose whole accessible text is an ambiguous phrase gives a
// screen-reader user listing links no purpose. The text is the anchor's
// children text (nested elements included), lowercased, punctuation dropped,
// whitespace collapsed; it is ambiguous when it equals one of the `words`
// (default "click here", "here", "link", "a link", "learn more"; the option
// replaces the list, jsx-a11y contract). An `aria-label` on the anchor is
// its name instead. Text that only contains a phrase, text the file cannot
// see (`{value}`), and a component or member expression (not proven to be an
// anchor) are silent.
// Note: this contract decides by matching phrases in a string, not structure;
// reported to the caller as a candidate for change.
module anchor_ambiguous_text {
  type Text = ClickHere | ClickHereCaps | ClickHerePunct | Here | LearnMore | ALink | Link
            | More | Descriptive | Containing | Nested | Expr | Mixed | AriaLabelled
  type Spelling = Child | Braced | Template
  type Elem = A | Component | Member
  type Opt = Default | Words
  type Focus = Texts | Spellings | Elems

  pure def ambiguousDefault(t: Text): bool =
    Set(ClickHere, ClickHereCaps, ClickHerePunct, Here, LearnMore, ALink, Link, Nested).contains(t)
  pure def reports(t: Text, e: Elem, o: Opt): bool =
    e == A and (if (o == Default) ambiguousDefault(t) else t == More)

  var focus: Focus
  var text: Text
  var spelling: Spelling
  var elem: Elem
  var opt: Opt
  var verdict: bool

  action step = {
    nondet fo = Set(Texts, Spellings, Elems).oneOf()
    nondet t = (if (fo == Texts)
                  Set(ClickHere, ClickHereCaps, ClickHerePunct, Here, LearnMore, ALink, Link, More,
                      Descriptive, Containing, Nested, Expr, Mixed, AriaLabelled)
                else Set(ClickHere, Descriptive)).oneOf()
    nondet sp = (if (fo == Spellings) Set(Child, Braced, Template) else Set(Child)).oneOf()
    nondet e = (if (fo == Elems) Set(A, Component, Member) else Set(A)).oneOf()
    nondet o = (if (fo == Texts) Set(Default, Words) else Set(Default)).oneOf()
    all { focus' = fo, text' = t, spelling' = sp, elem' = e, opt' = o,
          verdict' = reports(t, e, o) }
  }

  action init = step
}
