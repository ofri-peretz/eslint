// Model of eslint-plugin-react-a11y/autocomplete-valid (WCAG 1.3.5).
// The autocomplete attribute of an input (or a component listed in
// `inputComponents`) must be a valid HTML autofill detail
// (HTML §4.10.18.7.1): "on", "off", or [section-*] [shipping|billing]
// [home|work|mobile|fax|pager -- contact fields only] <one field name>
// [webauthn], tokens ASCII case-insensitive and whitespace-separated. Token
// names are spec-defined structure. A dynamic value, a non-control element and
// an unlisted component are silent. Whether a valid token suits the input
// type is out of scope (judgment): only type="text" inputs are sampled.
// The attribute is read under React's `autoComplete` and the HTML
// `autocomplete` spelling alike (both reach the DOM attribute).
// left out (scope extension, not a finding in this rule today): select and
// textarea, which HTML also lets carry autofill tokens.
module autocomplete_valid {
  type Value = On | Off | Email | Name | StreetAddress | ShippingPostal | SectionBillingEmail | HomeTel
             | WorkEmail | OneTimeCode | UsernameWebauthn | Upper | Padded
             | Foo | Typo | TwoFields | HomeName | BillingAlone | TrueTok
  type Spelling = Lit | Braced | Template | Dynamic
  type Elem = Input | Select | Textarea | Component | ComponentOpt | Div
  type AttrName = Camel | Lower
  type Focus = Values | Spellings | Elems

  pure def invalid(v: Value): bool = Set(Foo, Typo, TwoFields, HomeName, BillingAlone, TrueTok).contains(v)
  pure def control(e: Elem): bool = Set(Input, ComponentOpt).contains(e)

  var focus: Focus
  var value: Value
  var spelling: Spelling
  var elem: Elem
  var attrName: AttrName
  var verdict: bool

  action step = {
    nondet fo = Set(Values, Spellings, Elems).oneOf()
    nondet v = (if (fo == Values) Set(On, Off, Email, Name, StreetAddress, ShippingPostal, SectionBillingEmail,
                                      HomeTel, WorkEmail, OneTimeCode, UsernameWebauthn, Upper, Padded,
                                      Foo, Typo, TwoFields, HomeName, BillingAlone, TrueTok)
                else Set(Email, Foo)).oneOf()
    nondet sp = (if (fo == Spellings) Set(Lit, Braced, Template, Dynamic) else Set(Lit)).oneOf()
    nondet e = (if (fo == Elems) Set(Input, Component, ComponentOpt, Div) else Set(Input)).oneOf()
    nondet an = (if (fo == Values) Set(Camel, Lower) else Set(Camel)).oneOf()
    all { focus' = fo, attrName' = an, value' = v, spelling' = sp, elem' = e,
          verdict' = (invalid(v) and sp != Dynamic and control(e)) }
  }

  action init = step
}
