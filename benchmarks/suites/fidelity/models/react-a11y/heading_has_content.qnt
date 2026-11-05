// Model of eslint-plugin-react-a11y/heading-has-content (WCAG 2.4.6, 1.3.1).
// A heading (`h1`-`h6`, plus any component the `components` option names)
// must have content a screen reader can announce. Content is: text, an element
// child that is not `aria-hidden`, a child expression the file cannot see
// (`{value}`), a child component (`<Trans />`), `dangerouslySetInnerHTML`, or
// a `children` prop. It is proven missing when the heading is self-closing,
// empty, holds only whitespace, only `{undefined}`, or only an
// `aria-hidden="true"` child. A component the option does not name, or a
// member expression, is not a heading as far as the file proves.
// Left out: candidate for change (fires on a guess): `<h1 {...rest} />`, where
// the spread may carry `children` or `dangerouslySetInnerHTML`.
module heading_has_content {
  type Content = Text | Expr | ElemChild | CompChild | HiddenChild | SelfClosing | EmptyPair
               | Space | Undef | InnerHtml | ChildrenProp
  type Elem = H1 | H4 | Heading | MemberHeading
  type Opt = Default | Named

  pure def empty(c: Content): bool =
    Set(HiddenChild, SelfClosing, EmptyPair, Space, Undef).contains(c)
  pure def isHeading(e: Elem, o: Opt): bool =
    e == H1 or e == H4 or (e == Heading and o == Named)
  pure def reports(c: Content, e: Elem, o: Opt): bool = empty(c) and isHeading(e, o)

  var content: Content
  var elem: Elem
  var opt: Opt
  var verdict: bool

  action step = {
    nondet c = Set(Text, Expr, ElemChild, CompChild, HiddenChild, SelfClosing, EmptyPair,
                   Space, Undef, InnerHtml, ChildrenProp).oneOf()
    nondet e = Set(H1, H4, Heading, MemberHeading).oneOf()
    nondet o = Set(Default, Named).oneOf()
    all { content' = c, elem' = e, opt' = o, verdict' = reports(c, e, o) }
  }

  action init = step
}
