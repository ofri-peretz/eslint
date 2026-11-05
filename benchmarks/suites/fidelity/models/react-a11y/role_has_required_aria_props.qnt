// Model of eslint-plugin-react-a11y/role-has-required-aria-props (WCAG 4.1.2).
// WAI-ARIA 1.2 "Required States and Properties": a role that needs a state to
// be meaningful must carry it, or assistive technology cannot report it:
//   checkbox, radio, switch, menuitemcheckbox -> aria-checked
//   combobox  -> aria-controls, aria-expanded
//   slider    -> aria-valuenow   (aria-valuemin/max default to 0/100 in 1.2)
//   scrollbar -> aria-controls, aria-valuenow (orientation/min/max have defaults)
// A role with nothing required (button) is never a finding. The element's own
// native state supplies the property: `<input type="checkbox" role="switch">`
// exposes aria-checked from `checked` (ARIA in HTML), so it is silent. A
// dynamic role is unknown: silent.
// left out: candidate for change (fires on a guess): a spread that may carry
// the props (`<div role="checkbox" {...rest}>`) and a component or member
// element (`<Widget role="checkbox">`) whose DOM is unknown.
module role_has_required_aria_props {
  type Role = Checkbox | Radio | Switch | MenuItemCheckbox | Combobox | Slider | Scrollbar | Btn
  type Props = NoProps | Required | RequiredDyn | Partial
  type Spelling = Lit | Braced | Template | Dynamic
  type Elem = Div | NativeCheckbox

  pure def needsProps(r: Role): bool = r != Btn
  pure def checkedOnly(r: Role): bool = Set(Checkbox, Radio, Switch, MenuItemCheckbox).contains(r)
  pure def reports(r: Role, p: Props, sp: Spelling, e: Elem): bool =
    needsProps(r) and Set(NoProps, Partial).contains(p) and sp != Dynamic
    and not(e == NativeCheckbox and checkedOnly(r))

  var role: Role
  var props: Props
  var spelling: Spelling
  var elem: Elem
  var verdict: bool

  action step = {
    nondet e = Set(Div, NativeCheckbox).oneOf()
    nondet r = (if (e == NativeCheckbox) Set(Checkbox, Switch, MenuItemCheckbox, Btn)
                else Set(Checkbox, Radio, Switch, MenuItemCheckbox, Combobox, Slider,
                         Scrollbar, Btn)).oneOf()
    nondet p = Set(NoProps, Required, RequiredDyn, Partial).oneOf()
    nondet sp = Set(Lit, Braced, Template, Dynamic).oneOf()
    all { role' = r, props' = p, spelling' = sp, elem' = e, verdict' = reports(r, p, sp, e) }
  }

  action init = step
}
