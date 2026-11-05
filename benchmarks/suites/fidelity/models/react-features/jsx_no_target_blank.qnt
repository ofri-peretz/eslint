// Model of eslint-plugin-react-features/jsx-no-target-blank (CWE-1022).
// An `<a>` opening an external URL in a new browsing context
// (`target="_blank"`, any letter case, braced or plain) without `noopener`
// or `noreferrer` in `rel` lets the opened page reach `window.opener`
// (reverse tabnabbing). External: `http(s)://` in any letter case or a
// protocol-relative `//host`, plain or braced; a same-site path is not. `rel`
// tokens are read case-insensitively, plain or braced. `noopener` alone is
// enough (the doc's contract): `allowReferrer` only changes the autofix
// text. `links: false` stops checking anchors; `forms: true` checks
// `<form target="_blank">` too. With a spread and the default
// `warnOnSpreadAttributes: false` nothing is judged; with
// `enforceDynamicLinks: 'never'` a dynamic href or target is not judged.
// Left out: candidate for change (fires on a guess): with the default
// `enforceDynamicLinks: 'always'`, a dynamic `href` / `target` is assumed
// external / `_blank`; a dynamic `rel={rel}` is assumed to lack noopener;
// `warnOnSpreadAttributes: true` with a spread that may carry `rel`.
module jsx_no_target_blank {
  type Focus = Values | Opts | Dynamic
  type Href = External | ExternalUpper | ProtocolRelative | Local | BracedExternal | BracedLocal
  type Rel = NoRel | Noopener | Noreferrer | Both | OtherRel | BracedNoopener | UpperNoopener
  type Target = Blank | BlankBraced | BlankUpper | Self
  type Elem = Anchor | Form
  type Toggle = Off | On
  type Dyn = NoDyn | DynHref | DynTarget | SpreadDefault

  pure def external(h: Href): bool = not(Set(Local, BracedLocal).contains(h))
  pure def unprotected(r: Rel): bool = r == NoRel or r == OtherRel
  pure def reports(f: Focus, h: Href, r: Rel, t: Target, e: Elem, links: Toggle, forms: Toggle, d: Dyn): bool =
    if (f == Values) t != Self and external(h) and unprotected(r)
    else if (f == Opts) ((e == Anchor and links == On) or (e == Form and forms == On)) and unprotected(r)
    else false

  var focus: Focus
  var href: Href
  var rel: Rel
  var target: Target
  var elem: Elem
  var links: Toggle
  var forms: Toggle
  var allowReferrer: Toggle
  var dyn: Dyn
  var verdict: bool

  action step = {
    nondet f = Set(Values, Opts, Dynamic).oneOf()
    nondet h = (if (f == Values) Set(External, ExternalUpper, ProtocolRelative, Local, BracedExternal, BracedLocal)
                else Set(External)).oneOf()
    nondet r = (if (f == Values) Set(NoRel, Noopener, Noreferrer, Both, OtherRel, BracedNoopener, UpperNoopener)
                else if (f == Opts) Set(NoRel, Noopener)
                else Set(NoRel)).oneOf()
    nondet t = (if (f == Values) Set(Blank, BlankBraced, BlankUpper, Self) else Set(Blank)).oneOf()
    nondet e = (if (f == Opts) Set(Anchor, Form) else Set(Anchor)).oneOf()
    nondet l = (if (f == Opts) Set(On, Off) else Set(On)).oneOf()
    nondet fm = (if (f == Opts) Set(On, Off) else Set(Off)).oneOf()
    nondet ar = (if (f == Opts) Set(On, Off) else Set(Off)).oneOf()
    nondet d = (if (f == Dynamic) Set(DynHref, DynTarget, SpreadDefault) else Set(NoDyn)).oneOf()
    all { focus' = f, href' = h, rel' = r, target' = t, elem' = e, links' = l, forms' = fm,
          allowReferrer' = ar, dyn' = d, verdict' = reports(f, h, r, t, e, l, fm, d) }
  }

  action init = step
}
