// Model of eslint-plugin-react-a11y/aria-role (WCAG 4.1.2, WAI-ARIA 1.2 §5.4).
// `role` is a space-separated token list; every token must name a concrete
// WAI-ARIA role (the DPUB-ARIA `doc-*` and Graphics-ARIA `graphics-*` module
// roles included). Surrounding whitespace is not a token (`" button "`). An unknown or misspelled
// token, or an abstract role (`widget`, `range`: WAI-ARIA §5.3.2 says authors
// MUST NOT use them), gives assistive technology no usable role. Only a value
// the code states is evidence; a dynamic value is silent. An empty `role` is
// meaningless but harmless (no role): judgment, silent.
// Options: `allowedInvalidRoles` exempts listed tokens; `ignoreNonDOM` (default
// false) skips components, which otherwise are checked like DOM elements.
module aria_role {
  type Val = Button | Navigation | Presentation | None | TwoValid | DocChapter | GraphicsDoc | Padded | Empty
           | Abstract | Foo | Typo | Mixed
  type Spelling = Lit | Braced | Template | Cond | Dynamic
  type Elem = Div | Component | Member
  type Opt = Default | AllowFoo | IgnoreNonDOM

  // the invalid tokens a value carries: Foo -> {foo}, Mixed "button foo" -> {foo}
  pure def badFoo(v: Val): bool = Set(Foo, Mixed).contains(v)
  pure def badOther(v: Val): bool = Set(Abstract, Typo).contains(v)
  pure def reports(v: Val, sp: Spelling, e: Elem, o: Opt): bool =
    sp != Dynamic
    and (badOther(v) or (badFoo(v) and o != AllowFoo))
    and not(o == IgnoreNonDOM and e != Div)

  var value: Val
  var spelling: Spelling
  var elem: Elem
  var opt: Opt
  var verdict: bool

  action step = {
    nondet sp = Set(Lit, Braced, Template, Cond, Dynamic).oneOf()
    nondet v = (if (sp == Dynamic) Set(Button)
                else Set(Button, Navigation, Presentation, None, TwoValid, DocChapter, GraphicsDoc, Padded, Empty,
                         Abstract, Foo, Typo, Mixed)).oneOf()
    nondet e = Set(Div, Component, Member).oneOf()
    nondet o = Set(Default, AllowFoo, IgnoreNonDOM).oneOf()
    all { value' = v, spelling' = sp, elem' = e, opt' = o, verdict' = reports(v, sp, e, o) }
  }

  action init = step
}
