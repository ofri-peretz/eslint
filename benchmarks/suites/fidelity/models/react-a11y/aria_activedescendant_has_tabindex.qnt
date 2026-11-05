// Model of eslint-plugin-react-a11y/aria-activedescendant-has-tabindex (WCAG 4.1.2).
// WAI-ARIA 1.2 (aria-activedescendant): the element carrying it manages focus
// for its descendants, so it must itself be able to take DOM focus. A natively
// focusable element (input, button, select, textarea, a with href) already can;
// any other DOM element needs a tabIndex (0 or -1 both make it focusable; a
// dynamic value still sets one).
// left out: candidate for change (fires on a guess): a spread with no
// tabIndex (`<div aria-activedescendant {...rest}>`, the spread may carry it)
// and a component (`<Listbox aria-activedescendant>`) whose DOM is unknown.
module aria_activedescendant_has_tabindex {
  type Elem = Div | Span | Ul | Input | Button | Select | Textarea | AnchorHref | AnchorBare
  type Tab = NoTab | Zero | Neg | DynTab
  type Ad = AdLit | AdDynamic | AdAbsent

  pure def focusable(e: Elem): bool =
    Set(Input, Button, Select, Textarea, AnchorHref).contains(e)
  pure def reports(e: Elem, t: Tab, sp: bool, a: Ad): bool =
    a != AdAbsent and not(focusable(e)) and t == NoTab and not(sp)

  var elem: Elem
  var tab: Tab
  var spread: bool
  var ad: Ad
  var verdict: bool

  action step = {
    nondet e = Set(Div, Span, Ul, Input, Button, Select, Textarea, AnchorHref,
                   AnchorBare).oneOf()
    nondet t = Set(NoTab, Zero, Neg, DynTab).oneOf()
    nondet sp = (if (t == NoTab) Set(false) else Set(true, false)).oneOf()
    nondet a = Set(AdLit, AdDynamic, AdAbsent).oneOf()
    all { elem' = e, tab' = t, spread' = sp, ad' = a, verdict' = reports(e, t, sp, a) }
  }

  action init = step
}
