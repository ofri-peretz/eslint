// Model of eslint-plugin-react-a11y/no-interactive-element-to-noninteractive-role
// (WCAG 4.1.2). An interactive HTML element (button, a with href, input,
// select, textarea) stays focusable and operable whatever role it is given;
// a non-interactive role (article, heading, img, listitem, tooltip) or a
// presentational one (presentation/none: WAI-ARIA §9.3 conflict resolution
// ignores it on a focusable element) misdescribes the control to assistive
// technology. Interactive roles on it, and any role on a non-interactive
// element (div, a without href), are other rules. The option maps an element
// to non-interactive roles it may take; default {tr: [none, presentation]}.
// Non-default {button: [presentation]} allows exactly that pair. Dynamic roles
// and components: silent.
module no_interactive_element_to_noninteractive_role {
  type Elem = Button | AHref | InputText | Select | Textarea | Div | ABare | Component | Tr
  type Role = Article | Heading | Img | Listitem | Presentation | NoneRole | Tooltip
            | BtnRole | LinkRole
  type Spelling = Lit | Braced | Dynamic
  type Opt = Default | Custom

  pure def interactive(e: Elem): bool = Set(Button, AHref, InputText, Select, Textarea).contains(e)
  pure def nonInteractive(r: Role): bool = not(Set(BtnRole, LinkRole).contains(r))
  pure def allowed(e: Elem, r: Role, o: Opt): bool =
    o == Custom and e == Button and r == Presentation

  var elem: Elem
  var role: Role
  var spelling: Spelling
  var opt: Opt
  var verdict: bool

  action step = {
    nondet e = Set(Button, AHref, InputText, Select, Textarea, Div, ABare, Component, Tr).oneOf()
    nondet r = (if (e == Tr) Set(Presentation, NoneRole)
                else Set(Article, Heading, Img, Listitem, Presentation, NoneRole, Tooltip,
                         BtnRole, LinkRole)).oneOf()
    nondet sp = Set(Lit, Braced, Dynamic).oneOf()
    nondet o = (if (e == Tr) Set(Default) else Set(Default, Custom)).oneOf()
    all { elem' = e, role' = r, spelling' = sp, opt' = o,
          verdict' = (interactive(e) and nonInteractive(r) and sp != Dynamic
                      and not(allowed(e, r, o))) }
  }

  action init = step
}
