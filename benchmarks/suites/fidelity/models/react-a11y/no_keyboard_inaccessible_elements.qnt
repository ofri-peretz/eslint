// Model of eslint-plugin-react-a11y/no-keyboard-inaccessible-elements (WCAG 2.1.1).
// A clickable element of a kind listed in `checkElements` (default div, span)
// must at least be focusable: a clickable one with no tabIndex is unreachable
// from the keyboard, whatever key handlers it has. A role does not make it
// focusable. tabIndex={-1} or a dynamic tabIndex counts as focusable (roving
// focus is legitimate). Not findings: elements outside checkElements, custom
// components, no onClick, role presentation. `ignoreInTests` (default true)
// exempts test files.
// left out: candidate for change (fires on a guess): aria-hidden="true" and a
// spread (may carry the missing props).
// left out (scope extension, not a finding in this rule today): a focusable
// clickable element with no key handler (click-events-have-key-events owns it).
module no_keyboard_inaccessible_elements {
  type TestCtx = Prod | TestDefault | TestFlip
  type Elem = Div | Span | Section | Button | Component | Member
  type Opt = Default | CheckSection
  type Tab = NoTab | Zero | MinusOne | TabDynamic
  type Key = NoKey | KeyDown | KeyUp
  type Extra = Plain | NoClick | AriaHidden | RolePresentation | Spread | RoleButton
  type Focus = Elems | Support | Extras

  pure def checked(e: Elem, o: Opt): bool =
    if (o == CheckSection) e == Section else Set(Div, Span).contains(e)
  pure def reports(e: Elem, o: Opt, t: Tab, k: Key, x: Extra): bool =
    checked(e, o) and Set(Plain, RoleButton).contains(x) and t == NoTab

  var focus: Focus
  var elem: Elem
  var opt: Opt
  var tab: Tab
  var key: Key
  var extra: Extra
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, Support, Extras).oneOf()
    nondet e = (if (fo == Elems) Set(Div, Span, Section, Button, Component, Member) else Set(Div)).oneOf()
    nondet o = (if (fo == Elems) Set(Default, CheckSection) else Set(Default)).oneOf()
    nondet t = (if (fo == Support) Set(NoTab, Zero, MinusOne, TabDynamic) else Set(NoTab)).oneOf()
    nondet k = (if (fo != Support) Set(NoKey)
                else if (t == NoTab) Set(NoKey, KeyDown, KeyUp) else Set(KeyDown, KeyUp)).oneOf()
    nondet x = (if (fo == Extras) Set(Plain, NoClick, RolePresentation, RoleButton)
                else Set(Plain)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, elem' = e, opt' = o, tab' = t, key' = k, extra' = x, testCtx' = tc,
          verdict' = (reports(e, o, t, k, x) and tc != TestDefault) }
  }

  action init = step
}
