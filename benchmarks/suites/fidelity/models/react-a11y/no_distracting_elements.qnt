// Model of eslint-plugin-react-a11y/no-distracting-elements (WCAG 2.2.2 Pause,
// Stop, Hide). `<marquee>` and `<blink>` move or flash content the user cannot
// pause. The `elements` option (default ["marquee", "blink"]) names which of
// these the rule reports; with ["marquee"], `<blink>` is allowed. Other
// elements, and components whatever their name, are not these elements.
module no_distracting_elements {
  type Elem = Marquee | Blink | Div | MarqueeComponent | MemberMarquee
  type Opt = Default | MarqueeOnly

  pure def reports(e: Elem, o: Opt): bool =
    e == Marquee or (e == Blink and o == Default)

  var elem: Elem
  var opt: Opt
  var withProps: bool
  var verdict: bool

  action step = {
    nondet e = Set(Marquee, Blink, Div, MarqueeComponent, MemberMarquee).oneOf()
    nondet o = Set(Default, MarqueeOnly).oneOf()
    nondet p = Set(true, false).oneOf()
    all { elem' = e, opt' = o, withProps' = p, verdict' = reports(e, o) }
  }

  action init = step
}
