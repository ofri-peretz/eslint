// Model of eslint-plugin-react-a11y/no-noninteractive-element-interactions (WCAG 4.1.2).
// An element whose role is non-interactive -- by its HTML semantics (li, p,
// h1, article, img, ul) or by an explicit non-interactive WAI-ARIA role
// (role="article", role="listitem") -- must not carry interaction handlers:
// assistive technology announces it as content, so the action is undiscoverable.
// Interaction handlers default to onClick, onMouseDown, onMouseUp, onKeyDown,
// onKeyUp, onKeyPress; `handlers` replaces that list. Not findings: an
// interactive element or role (button, role="button" even on an li), static
// elements without a role (div, span: no-static-element-interactions),
// role presentation/none, aria-hidden="true", contentEditable, custom
// components, and non-interaction events (onLoad, onFocus).
// left out: candidate for change (fires on a guess): a dynamic role.
module no_noninteractive_element_interactions {
  type Elem = Li | P | H1 | Article | Img | Ul | Div | Button | DivRoleArticle | DivRoleListitem
            | DivRoleButton | LiRoleButton | Component | Member
  type Handler = NoHandler | Click | MouseDown | MouseUp | KeyDown | KeyUp | KeyPress | Load | OnFocus
  type Opt = Default | OnlyMouseDown
  type Extra = Plain | AriaHidden | RolePresentation | ContentEditable | RoleDynamic
  type Focus = Elems | Handlers | Extras

  pure def nonInteractive(e: Elem): bool =
    Set(Li, P, H1, Article, Img, Ul, DivRoleArticle, DivRoleListitem).contains(e)
  pure def counted(h: Handler, o: Opt): bool =
    if (o == OnlyMouseDown) h == MouseDown
    else Set(Click, MouseDown, MouseUp, KeyDown, KeyUp, KeyPress).contains(h)
  pure def reports(e: Elem, h: Handler, o: Opt, x: Extra): bool =
    nonInteractive(e) and counted(h, o) and x == Plain

  var focus: Focus
  var elem: Elem
  var handler: Handler
  var opt: Opt
  var extra: Extra
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, Handlers, Extras).oneOf()
    nondet e = (if (fo == Elems) Set(Li, P, H1, Article, Img, Ul, Div, Button, DivRoleArticle,
                                     DivRoleListitem, DivRoleButton, LiRoleButton, Component, Member)
                else Set(Li)).oneOf()
    nondet h = (if (fo == Handlers) Set(NoHandler, Click, MouseDown, MouseUp, KeyDown, KeyUp, KeyPress, Load, OnFocus)
                else Set(Click)).oneOf()
    nondet o = (if (fo == Handlers) Set(Default, OnlyMouseDown) else Set(Default)).oneOf()
    nondet x = (if (fo == Extras) Set(Plain, AriaHidden, RolePresentation, ContentEditable)
                else Set(Plain)).oneOf()
    all { focus' = fo, elem' = e, handler' = h, opt' = o, extra' = x, verdict' = reports(e, h, o, x) }
  }

  action init = step
}
