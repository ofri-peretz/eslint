// Model of eslint-plugin-react-a11y/tabindex-no-positive (WCAG 2.4.3 Focus Order).
// A positive tabindex pulls the element ahead of the document's natural tab
// sequence (HTML §6.6.3 sequential focus navigation), so focus order no longer
// follows the reading order. 0 and -1 are the safe values. Only a value the
// code states statically is evidence; a dynamic value is silent. The check is
// on the DOM attribute, so it holds on intrinsic elements.
// left out: candidate for change (fires on a guess): a component or member
// element (`<Button tabIndex="1">`, `<Ui.Button>`) whose DOM is unknown.
module tabindex_no_positive {
  type Val = Zero | Neg | One | Big
  type Spelling = Lit | BracedNum | BracedStr | Template | Cond | Dynamic
  type Elem = Div | Button | Anchor
  type AttrName = Camel | Lower

  pure def positive(v: Val, sp: Spelling): bool = sp != Dynamic and Set(One, Big).contains(v)

  var value: Val
  var spelling: Spelling
  var elem: Elem
  var attrName: AttrName
  var verdict: bool

  action step = {
    nondet sp = Set(Lit, BracedNum, BracedStr, Template, Cond, Dynamic).oneOf()
    nondet v = (if (sp == Dynamic) Set(Zero) else Set(Zero, Neg, One, Big)).oneOf()
    nondet e = Set(Div, Button, Anchor).oneOf()
    nondet n = Set(Camel, Lower).oneOf()
    all { value' = v, spelling' = sp, elem' = e, attrName' = n,
          verdict' = positive(v, sp) }
  }

  action init = step
}
