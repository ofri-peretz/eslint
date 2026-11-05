// Model of eslint-plugin-react-a11y/no-noninteractive-tabindex (WCAG 2.1.1/2.4.3).
// Putting a non-interactive element (h2, p, li, article, img, or any element
// given a non-interactive role such as role="article") into the tab sequence
// (tabIndex 0) adds a tab stop that does nothing. tabIndex -1 keeps it out of
// the sequence (programmatic focus: fine), and a dynamic tabIndex is unknown.
// Interactive elements and interactive roles are the point of tabIndex.
// Options: `tags` allows elements (non-default ['h2']); `roles` allows roles
// (default ['tabpanel']; non-default ['article']); `allowExpressionValues`
// (default true) skips an element whose role is an expression; false checks
// it as the bare element.
// left out: candidate for change (fires on a guess): `<div tabIndex="0">` and
// `<span tabIndex="0">` (the keyboard-scrollable-region pattern WCAG 2.1.1
// needs) and a component (`<Card tabIndex="0">`) whose DOM is unknown.
module no_noninteractive_tabindex {
  type Ctx = H2 | P | Li | Article | Img | DivArticleRole | Button | AHref
           | Input | DivButtonRole | DivTabpanel | H2DynRole
  type Tab = ZeroLit | ZeroBraced | Neg | Dyn
  type Opt = Default | Tags | Roles | NoExpr

  pure def inSequence(t: Tab): bool = Set(ZeroLit, ZeroBraced).contains(t)
  pure def reports(c: Ctx, t: Tab, o: Opt): bool =
    inSequence(t) and (
      (Set(H2, P, Li, Article, Img).contains(c) and not(o == Tags and c == H2))
      or (c == DivArticleRole and o != Roles)
      or (c == H2DynRole and o == NoExpr)
    )

  var ctx: Ctx
  var tab: Tab
  var opt: Opt
  var verdict: bool

  action step = {
    nondet c = Set(H2, P, Li, Article, Img, DivArticleRole, Button, AHref, Input,
                   DivButtonRole, DivTabpanel, H2DynRole).oneOf()
    nondet t = Set(ZeroLit, ZeroBraced, Neg, Dyn).oneOf()
    nondet o = (if (c == DivTabpanel) Set(Default, Tags, NoExpr)
                else Set(Default, Tags, Roles, NoExpr)).oneOf()
    all { ctx' = c, tab' = t, opt' = o, verdict' = reports(c, t, o) }
  }

  action init = step
}
