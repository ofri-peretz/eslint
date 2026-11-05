// Model of eslint-plugin-react-a11y/anchor-is-valid (WCAG 2.1.1, 2.4.4).
// An anchor is a link: it must navigate. Three aspects, all on by default
// (`aspects` option narrows them):
//   - noHref:       an anchor with a click handler and no href is a button
//                   pretending to be a link (not focusable, no Enter key).
//   - invalidHref:  `href="#"` and `href="javascript:..."` go nowhere: the
//                   link is not a link. `href=""` (judgment: it reloads the
//                   current page, a real destination) is silent.
//   - preferButton: a click handler on an anchor with no real destination
//                   (no href, or an invalid one) should be a <button>.
// When preferButton is off, its inputs fall to noHref / invalidHref. A real
// destination (path, URL, `#section` fragment, a value the file cannot see)
// is never a finding, with or without a handler. `components` makes a
// component an anchor; `specialLink` names the attribute it carries the
// destination in (`to`). A component the options do not name is silent.
// Left out (judgment): `<a>text</a>` with no href and no handler, a
// placeholder link HTML allows; the noHref aspect reports it today.
module anchor_is_valid {
  type Href = NoHref | Hash | Js | Empty | Fragment | Path | Dyn
  type Spelling = Lit | Braced | Template | Cond
  type Opt = Default | OnlyNoHref | OnlyInvalid | OnlyPreferButton | Components | SpecialLink
  type Elem = A | Link | LinkTo
  type Focus = Spellings | Aspects | Comps

  pure def invalid(h: Href): bool = Set(Hash, Js).contains(h)
  pure def noHrefOn(o: Opt): bool = Set(Default, OnlyNoHref, Components, SpecialLink).contains(o)
  pure def invalidOn(o: Opt): bool = Set(Default, OnlyInvalid, Components, SpecialLink).contains(o)
  pure def buttonOn(o: Opt): bool = Set(Default, OnlyPreferButton, Components, SpecialLink).contains(o)
  pure def checked(e: Elem, o: Opt): bool =
    e == A or (e == Link and o == Components) or (e == LinkTo and o == SpecialLink)
  pure def reports(h: Href, handler: bool, e: Elem, o: Opt): bool =
    checked(e, o) and (
      (h == NoHref and handler and (noHrefOn(o) or buttonOn(o)))
      or (invalid(h) and (invalidOn(o) or (handler and buttonOn(o)))))

  var focus: Focus
  var href: Href
  var spelling: Spelling
  var handler: bool
  var elem: Elem
  var opt: Opt
  var verdict: bool

  action step = {
    nondet fo = Set(Spellings, Aspects, Comps).oneOf()
    nondet hr = (if (fo == Spellings) Set(Hash, Js, Empty, Fragment, Path)
                 else Set(NoHref, Hash, Js, Empty, Fragment, Path, Dyn)).oneOf()
    nondet sp = (if (fo == Spellings) Set(Lit, Braced, Template, Cond) else Set(Lit)).oneOf()
    // NoHref without a handler is left out (judgment), so it always has one.
    nondet hd = (if (fo == Spellings) Set(false)
                 else if (hr == NoHref) Set(true) else Set(true, false)).oneOf()
    nondet o = (if (fo == Aspects) Set(Default, OnlyNoHref, OnlyInvalid, OnlyPreferButton)
                else if (fo == Comps) Set(Default, Components, SpecialLink)
                else Set(Default)).oneOf()
    nondet e = (if (fo == Comps) (if (o == SpecialLink) Set(LinkTo) else Set(Link))
                else Set(A)).oneOf()
    all { focus' = fo, href' = hr, spelling' = sp, handler' = hd, elem' = e, opt' = o,
          verdict' = reports(hr, hd, e, o) }
  }

  action init = step
}
