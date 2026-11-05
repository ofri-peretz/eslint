// Model of eslint-plugin-react-a11y/no-aria-hidden-on-focusable (WCAG 4.1.2).
// WAI-ARIA 1.2 (aria-hidden): authors MUST NOT hide a focusable element, or
// keyboard users land on something assistive technology says is not there.
// Hidden: aria-hidden="true", {true}, or the bare attribute (JSX true); "false"
// is not hidden, and a dynamic value is unknown. Focusable in the tab order:
// button, a with href, input (not type=hidden), select, textarea, and any
// element with tabIndex >= 0; tabIndex -1 removes it from the tab order and a
// disabled control cannot take focus. Components are not DOM: silent.
module no_aria_hidden_on_focusable {
  type Ctx = Button | AHref | ABare | Input | InputHidden | Select | Textarea | Div | DivTab0
           | DivTabNeg | ButtonTabNeg | ButtonDisabled | Component | Member
  type Hidden = TrueLit | TrueBraced | Bare | FalseLit | FalseBraced | Dyn

  pure def focusable(c: Ctx): bool =
    Set(Button, AHref, Input, Select, Textarea, DivTab0).contains(c)
  pure def hidden(h: Hidden): bool = Set(TrueLit, TrueBraced, Bare).contains(h)

  var ctx: Ctx
  var hid: Hidden
  var verdict: bool

  action step = {
    nondet c = Set(Button, AHref, ABare, Input, InputHidden, Select, Textarea, Div, DivTab0,
                   DivTabNeg, ButtonTabNeg, ButtonDisabled, Component, Member).oneOf()
    nondet h = Set(TrueLit, TrueBraced, Bare, FalseLit, FalseBraced, Dyn).oneOf()
    all { ctx' = c, hid' = h, verdict' = (focusable(c) and hidden(h)) }
  }

  action init = step
}
