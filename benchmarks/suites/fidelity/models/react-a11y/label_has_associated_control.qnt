// Model of eslint-plugin-react-a11y/label-has-associated-control (WCAG 1.3.1, 4.1.2).
// A <label> (or a component listed in `labelComponents`) must have label text
// and be associated with a control (HTML §4.10.4): by htmlFor (any value,
// including dynamic) or by nesting a labelable control (input, select,
// textarea, or a `controlComponents` component) at any depth. `assert` picks
// which association is required: htmlFor, nesting, both, either (default).
// Text is text content, an aria-label / aria-labelledby, or an attribute
// listed in `labelAttributes`; an expression or component child may supply
// the text: silent. Unlisted custom components and non-label elements are
// silent.
// left out: candidate for change (fires on a guess): an association the file
// cannot see -- an expression child, an unlisted custom component child, a
// spread.
module label_has_associated_control {
  type Elem = Label | CustomLabel | CustomLabelOpt | Div
  type Assoc = NoAssoc | HtmlFor | HtmlForDynamic | NestedInput | NestedSelect | NestedDeep
             | NestedComponent | NestedControlComp | ExprChild | Spread | HtmlForAndNested
  type Content = Text | NoText | AriaLabel | ExprText | ComponentText | CustomAttr | CustomAttrOpt
  type Assert = AEither | AHtmlFor | ANesting | ABoth
  type Focus = Elems | Assocs | Contents | Asserts

  pure def hasFor(a: Assoc): bool = Set(HtmlFor, HtmlForDynamic, HtmlForAndNested).contains(a)
  pure def nests(a: Assoc): bool =
    Set(NestedInput, NestedSelect, NestedDeep, NestedControlComp, HtmlForAndNested).contains(a)
  pure def unknown(a: Assoc): bool = Set(NestedComponent, ExprChild, Spread).contains(a)
  pure def assocOk(a: Assoc, x: Assert): bool =
    unknown(a) or (
      if (x == AHtmlFor) hasFor(a)
      else if (x == ANesting) nests(a)
      else if (x == ABoth) (hasFor(a) and nests(a))
      else (hasFor(a) or nests(a)))
  pure def hasText(c: Content): bool = not(Set(NoText, CustomAttr).contains(c))
  pure def isLabel(e: Elem): bool = Set(Label, CustomLabelOpt).contains(e)

  var focus: Focus
  var elem: Elem
  var assoc: Assoc
  var content: Content
  var assertion: Assert
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, Assocs, Contents, Asserts).oneOf()
    nondet e = (if (fo == Elems) Set(Label, CustomLabel, CustomLabelOpt, Div) else Set(Label)).oneOf()
    nondet a = (if (fo == Assocs) Set(NoAssoc, HtmlFor, HtmlForDynamic, NestedInput, NestedSelect, NestedDeep,
                                      NestedControlComp)
                else if (fo == Asserts) Set(NoAssoc, HtmlFor, NestedInput, HtmlForAndNested)
                else if (fo == Contents) Set(HtmlFor)
                else Set(NoAssoc, HtmlFor)).oneOf()
    nondet c = (if (fo == Contents) Set(Text, NoText, AriaLabel, ExprText, ComponentText, CustomAttr, CustomAttrOpt)
                else Set(Text)).oneOf()
    nondet x = (if (fo == Asserts) Set(AEither, AHtmlFor, ANesting, ABoth) else Set(AEither)).oneOf()
    all { focus' = fo, elem' = e, assoc' = a, content' = c, assertion' = x,
          verdict' = (isLabel(e) and (not(hasText(c)) or not(assocOk(a, x)))) }
  }

  action init = step
}
