// Model of eslint-plugin-react-a11y/aria-props (WCAG 4.1.2, WAI-ARIA 1.2 §6.6).
// An attribute in the `aria-` namespace must be a state or property WAI-ARIA
// defines: a misspelled or made-up `aria-*` name is ignored by assistive
// technology, so the semantics the author meant never reach it. The name is
// spec-defined structure, so the check holds on any element and whatever the
// value is; a valid name is never a finding. WAI-ARIA 1.3 names browsers
// already ship (aria-description) are valid.
module aria_props {
  type Name = Label | LabelledBy | DescribedBy | Hidden | Expanded | Controls | Current
            | ErrorMessage | RoleDescription | Description
            | LabeledByTypo | Foo | LabelBy | Hiddenn
  type Elem = Div | Input | Component | Member
  type Spelling = Lit | Braced | Dynamic | Cond

  pure def invalid(n: Name): bool = Set(LabeledByTypo, Foo, LabelBy, Hiddenn).contains(n)

  var name: Name
  var elem: Elem
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet n = Set(Label, LabelledBy, DescribedBy, Hidden, Expanded, Controls, Current,
                   ErrorMessage, RoleDescription, Description,
                   LabeledByTypo, Foo, LabelBy, Hiddenn).oneOf()
    nondet e = Set(Div, Input, Component, Member).oneOf()
    nondet sp = Set(Lit, Braced, Dynamic, Cond).oneOf()
    all { name' = n, elem' = e, spelling' = sp, verdict' = invalid(n) }
  }

  action init = step
}
