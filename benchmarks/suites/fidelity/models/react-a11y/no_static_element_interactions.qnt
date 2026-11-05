// Model of eslint-plugin-react-a11y/no-static-element-interactions (WCAG 4.1.2).
// A static element -- one with no semantic role (div, span, an <a> without
// href) and no explicit role -- that carries an interaction handler exposes an
// action assistive technology cannot announce: it needs a role. Interaction
// handlers default to onClick, onMouseDown, onMouseUp, onKeyDown, onKeyUp,
// onKeyPress; `handlers` replaces that list. Not findings: any explicit role,
// semantic elements (li, button, a[href]), custom components, and
// non-interaction events (onLoad, onFocus).
// left out: candidate for change (fires on a guess): a dynamic role, a spread (may
// carry the role), and the aria-hidden="true" / role="presentation" opt-outs.
module no_static_element_interactions {
  type Elem = Div | Span | AnchorNoHref | AnchorHref | Button | Li | DivRoleButton | DivRoleArticle
            | DivRoleDynamic | Component | Member
  type Handler = NoHandler | Click | MouseDown | MouseUp | KeyDown | KeyUp | KeyPress | Load | OnFocus
  type Opt = Default | OnlyMouseDown
  type Extra = Plain | AriaHidden | RolePresentation | Spread
  type Focus = Elems | Handlers | Extras

  pure def isStatic(e: Elem): bool = Set(Div, Span, AnchorNoHref).contains(e)
  pure def counted(h: Handler, o: Opt): bool =
    if (o == OnlyMouseDown) h == MouseDown
    else Set(Click, MouseDown, MouseUp, KeyDown, KeyUp, KeyPress).contains(h)
  pure def reports(e: Elem, h: Handler, o: Opt, x: Extra): bool =
    isStatic(e) and counted(h, o) and x == Plain

  var focus: Focus
  var elem: Elem
  var handler: Handler
  var opt: Opt
  var extra: Extra
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, Handlers, Extras).oneOf()
    nondet e = (if (fo == Elems) Set(Div, Span, AnchorNoHref, AnchorHref, Button, Li, DivRoleButton,
                                     DivRoleArticle, Component, Member)
                else Set(Div)).oneOf()
    nondet h = (if (fo == Handlers) Set(NoHandler, Click, MouseDown, MouseUp, KeyDown, KeyUp, KeyPress, Load, OnFocus)
                else Set(Click)).oneOf()
    nondet o = (if (fo == Handlers) Set(Default, OnlyMouseDown) else Set(Default)).oneOf()
    nondet x = (if (fo == Extras) Set(Plain) else Set(Plain)).oneOf()
    all { focus' = fo, elem' = e, handler' = h, opt' = o, extra' = x, verdict' = reports(e, h, o, x) }
  }

  action init = step
}
