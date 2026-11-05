// Model of eslint-plugin-react-a11y/aria-unsupported-elements (WCAG 4.1.2).
// ARIA in HTML (§4, "Document conformance requirements") lists elements that
// take no `role` and no `aria-*` attribute at all: they are not rendered, or
// have no accessibility tree node (meta, html, script, style, track, col,
// colgroup, source, base, link, head, title, template, param, picture,
// noscript). Any `role` or `aria-*` attribute on them is meaningless, whatever
// its value. Elements that support ARIA are never a finding, `data-*` is not
// ARIA, and a spread may carry anything (no evidence). Components are not DOM
// elements: silent.
module aria_unsupported_elements {
  type Elem = Meta | Html | Script | Style | Track | Col | Source | Link | Title | Picture
            | Div | Span | Input | Img | Component | Member
  type Attr = Role | AriaHidden | AriaLabel | Data | Spread
  type Spelling = Lit | Dynamic

  pure def reserved(e: Elem): bool =
    Set(Meta, Html, Script, Style, Track, Col, Source, Link, Title, Picture).contains(e)
  pure def aria(a: Attr): bool = Set(Role, AriaHidden, AriaLabel).contains(a)

  var elem: Elem
  var at: Attr
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet e = Set(Meta, Html, Script, Style, Track, Col, Source, Link, Title, Picture,
                   Div, Span, Input, Img, Component, Member).oneOf()
    nondet a = Set(Role, AriaHidden, AriaLabel, Data, Spread).oneOf()
    nondet sp = (if (a == Spread) Set(Lit) else Set(Lit, Dynamic)).oneOf()
    all { elem' = e, at' = a, spelling' = sp, verdict' = (reserved(e) and aria(a)) }
  }

  action init = step
}
