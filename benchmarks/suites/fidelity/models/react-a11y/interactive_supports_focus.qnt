// Model of eslint-plugin-react-a11y/interactive-supports-focus (WCAG 2.1.1, 2.4.3).
// An element the author made interactive (an interactive WAI-ARIA role plus an
// interaction handler) must be focusable, or keyboard users cannot reach it.
// Native focusable elements (button, a[href]) already are. A tabIndex makes it
// focusable; when the role is listed in `tabbable` it must be in the tab order
// (tabIndex >= 0), so tabIndex={-1} is a finding for that role only. A dynamic
// tabIndex, aria-disabled="true", aria-hidden="true" and custom components
// are silent.
// left out: candidate for change (fires on a guess): a dynamic role and a spread
// (may carry tabIndex).
module interactive_supports_focus {
  type Elem = Div | Span | Button | AnchorHref | Component | Member
  type Role = NoRole | RoleButton | RoleLink | RoleCheckbox | RolePresentation | RoleArticle | RoleDynamic
  type Handler = NoHandler | Click | KeyDown | MouseDown
  type Tab = NoTab | Zero | MinusOne | TabDynamic | Spread
  type Opt = Default | TabbableButton
  type Extra = Plain | AriaDisabled | AriaHidden
  type Focus = Roles | Elems | Handlers | Tabs | Extras

  pure def interactiveRole(r: Role): bool = Set(RoleButton, RoleLink, RoleCheckbox).contains(r)
  pure def needsCheck(e: Elem): bool = Set(Div, Span).contains(e)
  pure def reports(e: Elem, r: Role, h: Handler, t: Tab, o: Opt, x: Extra): bool =
    needsCheck(e) and interactiveRole(r) and h != NoHandler and x == Plain and
    (t == NoTab or (t == MinusOne and o == TabbableButton and r == RoleButton))

  var focus: Focus
  var elem: Elem
  var role: Role
  var handler: Handler
  var tab: Tab
  var opt: Opt
  var extra: Extra
  var verdict: bool

  action step = {
    nondet fo = Set(Roles, Elems, Handlers, Tabs, Extras).oneOf()
    nondet e = (if (fo == Elems) Set(Div, Span, Button, AnchorHref, Component, Member) else Set(Div)).oneOf()
    nondet r = (if (fo == Roles) Set(NoRole, RoleButton, RoleLink, RoleCheckbox, RolePresentation, RoleArticle)
                else if (fo == Tabs) Set(RoleButton, RoleCheckbox) else Set(RoleButton)).oneOf()
    nondet h = (if (fo == Handlers) Set(NoHandler, Click, KeyDown, MouseDown) else Set(Click)).oneOf()
    nondet t = (if (fo == Tabs) Set(NoTab, Zero, MinusOne, TabDynamic)
                else if (fo == Roles or fo == Elems) Set(NoTab, Zero) else Set(NoTab)).oneOf()
    nondet o = (if (fo == Tabs) Set(Default, TabbableButton) else Set(Default)).oneOf()
    nondet x = (if (fo == Extras) Set(Plain, AriaDisabled, AriaHidden) else Set(Plain)).oneOf()
    all { focus' = fo, elem' = e, role' = r, handler' = h, tab' = t, opt' = o, extra' = x,
          verdict' = reports(e, r, h, t, o, x) }
  }

  action init = step
}
