// Model of eslint-plugin-react-a11y/anchor-has-content (WCAG 2.4.4, 4.1.2).
// An anchor (`<a>`, plus any component the `components` option names) must
// have an accessible name. It comes from content (text, an element child that
// is not `aria-hidden`, a child expression or component the file cannot see,
// `dangerouslySetInnerHTML`, a `children` prop) or from `aria-label`,
// `aria-labelledby` or `title` on the anchor. It is proven missing when the
// anchor is self-closing, empty, whitespace only, `{undefined}` only, or holds
// only an `aria-hidden="true"` child, and no naming attribute is set. A
// component the option does not name, or a member expression, is not proven
// to render an anchor.
// Left out: candidate for change (fires on a guess): `<a href="/x" {...rest} />`,
// where the spread may carry children or a name.
module anchor_has_content {
  type Content = Text | Expr | ElemChild | CompChild | HiddenChild | SelfClosing | EmptyPair
               | Space | Undef | InnerHtml | ChildrenProp
  type Name = NoName | AriaLabel | AriaLabelledby | Title
  type Elem = A | Link | MemberLink
  type Opt = Default | Named
  type Focus = Contents | Names

  pure def empty(c: Content): bool =
    Set(HiddenChild, SelfClosing, EmptyPair, Space, Undef).contains(c)
  pure def isAnchor(e: Elem, o: Opt): bool = e == A or (e == Link and o == Named)
  pure def reports(c: Content, n: Name, e: Elem, o: Opt): bool =
    empty(c) and n == NoName and isAnchor(e, o)

  var focus: Focus
  var content: Content
  var name: Name
  var elem: Elem
  var opt: Opt
  var verdict: bool

  action step = {
    nondet fo = Set(Contents, Names).oneOf()
    nondet c = (if (fo == Contents)
                  Set(Text, Expr, ElemChild, CompChild, HiddenChild, SelfClosing, EmptyPair,
                      Space, Undef, InnerHtml, ChildrenProp)
                else Set(SelfClosing)).oneOf()
    nondet n = (if (fo == Names) Set(AriaLabel, AriaLabelledby, Title) else Set(NoName)).oneOf()
    nondet e = Set(A, Link, MemberLink).oneOf()
    nondet o = Set(Default, Named).oneOf()
    all { focus' = fo, content' = c, name' = n, elem' = e, opt' = o,
          verdict' = reports(c, n, e, o) }
  }

  action init = step
}
