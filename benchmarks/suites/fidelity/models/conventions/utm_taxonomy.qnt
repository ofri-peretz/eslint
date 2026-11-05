// Model of eslint-plugin-conventions/utm-taxonomy.
// UTM values are an enum: the rule reads a `utm_source` / `utm_medium` query
// parameter out of a URL written in the code and reports a value outside the
// fixed taxonomy (case-sensitive; a percent-encoded value is decoded first).
// It reads quoted strings and template literals alike. It does not report:
//   - a value in the taxonomy (also when percent-encoded);
//   - a value the code does not spell out: a template placeholder that is the
//     value, or that ends it (`utm_source=dev${suffix}`) - the value is only
//     known at runtime, and an unknown value is not a finding.
// The taxonomy itself is the documented convention, taken as given.
module utm_taxonomy {
  type Site = Quoted | TemplateStatic | TemplateTail | TemplatePartial
  type Param = Source | Medium
  type Value = Valid | Invalid | WrongCase | EncodedValid

  pure def reports(s: Site, v: Value): bool =
    s != TemplatePartial and Set(Invalid, WrongCase).contains(v)

  var site: Site
  var param: Param
  var value: Value
  var verdict: bool

  action step = {
    nondet s = Set(Quoted, TemplateStatic, TemplateTail, TemplatePartial).oneOf()
    nondet p = Set(Source, Medium).oneOf()
    nondet v = Set(Valid, Invalid, WrongCase, EncodedValid).oneOf()
    all { site' = s, param' = p, value' = v, verdict' = reports(s, v) }
  }

  action init = step
}
