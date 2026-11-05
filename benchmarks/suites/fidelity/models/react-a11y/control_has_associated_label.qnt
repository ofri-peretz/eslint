// Model of eslint-plugin-react-a11y/control-has-associated-label (WCAG 4.1.2, 1.3.1).
// An interactive control -- a native control (button, a[href], select,
// textarea, input) or an element with an interactive WAI-ARIA role -- must
// have a text label. A label is: text content (at any nesting depth), an
// aria-label or aria-labelledby, or an attribute listed in `labelAttributes`.
// An expression child may supply one: silent. An input with neither id nor
// wrapping label is proven unlabelled.
// left out: candidate for change (fires on a guess): a custom component child,
// a spread, title (accname fallback) and an input with an id (a <label
// htmlFor> elsewhere may name it).
// aria-hidden="true" controls are exempt. Custom components are silent unless
// listed in `controlComponents`. `ignoreElements` / `ignoreRoles` exempt the
// listed tag names / roles.
module control_has_associated_label {
  type Elem = Button | AnchorHref | AnchorNoHref | DivRoleButton | InputText | InputTextId | Select
            | Textarea | Div | Component | CustomButton
  type Label = NoLabel | Text | AriaLabel | AriaLabelledby | Title | Expr | ComponentChild | Nested
             | Spread | CustomAttr | CustomAttrOpt | Hidden
  type Opt = Default | IgnoreElem | IgnoreRole | ControlComp
  type Focus = Elems | Labels | Opts

  pure def control(e: Elem, o: Opt): bool =
    if (e == CustomButton) o == ControlComp
    else if (e == Button) o != IgnoreElem
    else if (e == DivRoleButton) o != IgnoreRole
    else Set(AnchorHref, InputText, Select, Textarea).contains(e)
  pure def labelled(l: Label): bool = l != NoLabel and l != CustomAttr

  var focus: Focus
  var elem: Elem
  var label: Label
  var opt: Opt
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, Labels, Opts).oneOf()
    nondet e = (if (fo == Elems) Set(Button, AnchorHref, AnchorNoHref, DivRoleButton, InputText,
                                     Select, Textarea, Div, Component, CustomButton)
                else if (fo == Opts) Set(Button, DivRoleButton, CustomButton) else Set(Button)).oneOf()
    nondet l = (if (fo == Labels) Set(NoLabel, Text, AriaLabel, AriaLabelledby, Expr,
                                      Nested, CustomAttr, CustomAttrOpt, Hidden)
                else Set(NoLabel)).oneOf()
    nondet o = (if (fo == Opts) Set(Default, IgnoreElem, IgnoreRole, ControlComp) else Set(Default)).oneOf()
    all { focus' = fo, elem' = e, label' = l, opt' = o,
          verdict' = (control(e, o) and not(labelled(l))) }
  }

  action init = step
}
