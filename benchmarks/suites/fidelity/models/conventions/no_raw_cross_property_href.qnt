// Model of eslint-plugin-conventions/no-raw-cross-property-href.
// A link between our own properties must go through `buildUtmHref()` so it
// carries attribution. The rule reports an `href` attribute whose value is an
// absolute URL to one of the sibling properties the docs list, written as raw
// text: a quoted attribute, or a string / placeholder-free template in an
// expression container - the same literal in a different spelling.
// It does not report:
//   - the URL passed through `buildUtmHref(...)`;
//   - external hosts, same-site paths and anchors;
//   - the URL on an attribute that is not `href`.
// The host list is the documented taxonomy of our properties, taken as given.
module no_raw_cross_property_href {
  type Spelling = AttrString | ExprString | ExprTemplate | Wrapped | OtherAttr
  type Target = Sibling | Apex | External | Relative | Anchor

  pure def raw(s: Spelling): bool = Set(AttrString, ExprString, ExprTemplate).contains(s)
  pure def ours(t: Target): bool = Set(Sibling, Apex).contains(t)
  pure def reports(s: Spelling, t: Target): bool = raw(s) and ours(t)

  var spelling: Spelling
  var target: Target
  var verdict: bool

  action step = {
    nondet s = Set(AttrString, ExprString, ExprTemplate, Wrapped, OtherAttr).oneOf()
    nondet t = Set(Sibling, Apex, External, Relative, Anchor).oneOf()
    all { spelling' = s, target' = t, verdict' = reports(s, t) }
  }

  action init = step
}
