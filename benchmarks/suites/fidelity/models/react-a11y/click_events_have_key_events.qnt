// Model of eslint-plugin-react-a11y/click-events-have-key-events (WCAG 2.1.1).
// A click handler on an element the browser does not already make
// keyboard-operable leaves keyboard users without the action: it must be paired
// with a key handler (onKeyDown / onKeyUp / onKeyPress). Native interactive
// elements (button, a[href], input, select, textarea) fire click from the
// keyboard themselves. aria-hidden="false" hides nothing.
// left out: candidate for change (fires on a guess): custom components and member
// components (DOM unknown), a spread (may carry the key handler), and the
// aria-hidden="true" / role presentation|none opt-outs.
// An `<a>` without href is not keyboard-operable. An interactive ARIA role
// (role="button") on a div does not make it keyboard-operable either: the
// author must still handle keys (WAI-ARIA APG), so it is still a finding.
module click_events_have_key_events {
  type Elem = Div | Span | Li | AnchorNoHref | RoleButton | RoleLink | Button | AnchorHref | Input | Select | Textarea | Component | Member
  type Key = NoKey | KeyDown | KeyUp | KeyPress | Spread
  type Hidden = Shown | AriaHiddenTrue | AriaHiddenBraced | AriaHiddenFalse | RolePresentation | RoleNone
  type Focus = Elems | Keys | Hiddens

  pure def nonInteractive(e: Elem): bool = Set(Div, Span, Li, AnchorNoHref, RoleButton, RoleLink).contains(e)
  pure def exempt(h: Hidden): bool = Set(AriaHiddenTrue, AriaHiddenBraced, RolePresentation, RoleNone).contains(h)
  pure def reports(e: Elem, k: Key, h: Hidden, c: bool): bool =
    c and nonInteractive(e) and k == NoKey and not(exempt(h))

  var focus: Focus
  var elem: Elem
  var key: Key
  var hidden: Hidden
  var click: bool
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, Keys, Hiddens).oneOf()
    nondet e = (if (fo == Elems) Set(Div, Span, Li, AnchorNoHref, RoleButton, RoleLink, Button, AnchorHref, Input, Select, Textarea)
                else if (fo == Hiddens) Set(Div, Span) else Set(Div)).oneOf()
    nondet k = (if (fo == Keys) Set(NoKey, KeyDown, KeyUp, KeyPress) else Set(NoKey, KeyDown)).oneOf()
    nondet h = (if (fo == Hiddens) Set(Shown, AriaHiddenFalse)
                else Set(Shown)).oneOf()
    nondet c = (if (fo == Keys) Set(true, false) else Set(true)).oneOf()
    all { focus' = fo, elem' = e, key' = k, hidden' = h, click' = c, verdict' = reports(e, k, h, c) }
  }

  action init = step
}
