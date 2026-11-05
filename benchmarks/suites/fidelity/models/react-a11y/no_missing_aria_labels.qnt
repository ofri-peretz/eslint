// Model of eslint-plugin-react-a11y/no-missing-aria-labels (WCAG 4.1.2, 1.3.1).
// An element in `requireLabels` (default button, input, select, textarea)
// must have an accessible name (W3C accname 1.2 / HTML-AAM). It has one when
// it carries aria-label (non-empty), aria-labelledby or title, is wrapped in a
// <label>, or -- for a button -- has text or expression content. input
// type=submit has a default name; type=hidden is not rendered. Only a control
// proven nameless is a finding. Custom components are silent.
// `ignoreInTests` (default true) exempts test files.
// left out: candidate for change (fires on a guess): a spread, an id (a
// <label htmlFor> elsewhere may name it) and a placeholder (HTML-AAM fallback).
module no_missing_aria_labels {
  type TestCtx = Prod | TestDefault | TestFlip
  type Elem = ButtonEmpty | ButtonIcon | InputText | InputHidden | InputSubmit | Select | Textarea
            | Img | Component | Div
  type Opt = Default | OnlyInput
  type InputName = INone | IAriaLabel | IAriaLabelDynamic | IAriaLabelEmpty | IAriaLabelledby | ITitle
                 | IId | IWrapped | ISpread | IPlaceholder
  type ButtonName = BNone | BText | BAriaLabel | BTitle | BSpread | BExpr
  type Focus = Elems | InputNames | ButtonNames

  pure def required(e: Elem, o: Opt): bool =
    if (o == OnlyInput) Set(InputText, InputHidden, InputSubmit).contains(e)
    else Set(ButtonEmpty, ButtonIcon, InputText, InputHidden, InputSubmit, Select, Textarea).contains(e)
  pure def nameless(e: Elem): bool = Set(ButtonEmpty, ButtonIcon, InputText, Select, Textarea).contains(e)
  pure def reports(fo: Focus, e: Elem, o: Opt, i: InputName, b: ButtonName): bool =
    if (fo == InputNames) Set(INone, IAriaLabelEmpty).contains(i)
    else if (fo == ButtonNames) b == BNone
    else required(e, o) and nameless(e)

  var focus: Focus
  var elem: Elem
  var opt: Opt
  var inputName: InputName
  var buttonName: ButtonName
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Elems, InputNames, ButtonNames).oneOf()
    nondet e = (if (fo == Elems) Set(ButtonEmpty, ButtonIcon, InputText, InputHidden, InputSubmit, Select,
                                     Textarea, Img, Component, Div)
                else if (fo == InputNames) Set(InputText) else Set(ButtonEmpty)).oneOf()
    nondet o = (if (fo == Elems) Set(Default, OnlyInput) else Set(Default)).oneOf()
    nondet i = (if (fo == InputNames) Set(INone, IAriaLabel, IAriaLabelDynamic, IAriaLabelEmpty, IAriaLabelledby,
                                          ITitle, IWrapped)
                else Set(INone)).oneOf()
    nondet b = (if (fo == ButtonNames) Set(BNone, BText, BAriaLabel, BTitle, BExpr) else Set(BNone)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, elem' = e, opt' = o, inputName' = i, buttonName' = b, testCtx' = tc,
          verdict' = (reports(fo, e, o, i, b) and tc != TestDefault) }
  }

  action init = step
}
