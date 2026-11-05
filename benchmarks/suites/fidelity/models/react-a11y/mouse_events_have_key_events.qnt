// Model of eslint-plugin-react-a11y/mouse-events-have-key-events (WCAG 2.1.1).
// Behaviour wired to the pointer entering an element (onMouseOver) must also
// be reachable by keyboard focus (onFocus), and behaviour wired to it leaving
// (onMouseOut) by onBlur. onMouseEnter / onMouseLeave are outside the
// contract the rule cites (jsx-a11y defaults to Over/Out): left to judgment,
// silent.
// Native interactivity does not help: a button still only fires the hover
// handler for the mouse.
// left out: candidate for change (fires on a guess): custom and member components
// (DOM unknown) and a spread (may carry the focus/blur handler).
module mouse_events_have_key_events {
  type Elem = Div | Span | Button | AnchorHref | Component | Member
  type Hover = NoHover | Over | Enter | Out | Leave
  type Pair = NoPair | OnFocus | OnBlur | Both | Spread

  pure def intrinsic(e: Elem): bool = not(Set(Component, Member).contains(e))
  pure def reports(e: Elem, h: Hover, p: Pair): bool =
    intrinsic(e) and p != Spread and (
      (h == Over and not(Set(OnFocus, Both).contains(p)))
      or (h == Out and not(Set(OnBlur, Both).contains(p))))

  var elem: Elem
  var hover: Hover
  var pair: Pair
  var verdict: bool

  action step = {
    nondet e = Set(Div, Span, Button, AnchorHref).oneOf()
    nondet h = Set(NoHover, Over, Enter, Out, Leave).oneOf()
    nondet p = Set(NoPair, OnFocus, OnBlur, Both).oneOf()
    all { elem' = e, hover' = h, pair' = p, verdict' = reports(e, h, p) }
  }

  action init = step
}
