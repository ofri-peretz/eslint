// Model of eslint-plugin-react-a11y/iframe-has-title (WCAG 2.4.1, 4.1.2).
// An `<iframe>` needs a non-empty `title`: it is the frame's accessible name,
// the only way a screen-reader user knows what the frame holds before entering
// it. No `title`, `title=""` and `title={undefined}` leave the frame unnamed.
// A value the file cannot see (`title={value}`) is not a finding. A component
// named `Iframe` is not proven to render an iframe: silent.
// Left out: candidate for change (fires on a guess): `<iframe {...rest}>`
// with no `title`, where the spread may carry it.
module iframe_has_title {
  type Title = Absent | Empty | Undef | Value | Dyn
  type Spelling = Lit | Braced | Template | Cond
  type Elem = Iframe | Component | Member

  pure def reports(t: Title, e: Elem): bool =
    e == Iframe and Set(Absent, Empty, Undef).contains(t)

  var title: Title
  var spelling: Spelling
  var elem: Elem
  var verdict: bool

  action step = {
    nondet t = Set(Absent, Empty, Undef, Value, Dyn).oneOf()
    nondet sp = (if (Set(Empty, Value).contains(t)) Set(Lit, Braced, Template, Cond) else Set(Lit)).oneOf()
    nondet e = Set(Iframe, Component, Member).oneOf()
    all { title' = t, spelling' = sp, elem' = e, verdict' = reports(t, e) }
  }

  action init = step
}
