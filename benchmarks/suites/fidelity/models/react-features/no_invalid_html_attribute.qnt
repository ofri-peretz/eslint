// Model of eslint-plugin-react-features/no-invalid-html-attribute.
// On a DOM element React expects the camelCase prop name, and warns for the
// HTML spelling ("Invalid DOM property `class`. Did you mean `className`?").
// Reported: an HTML-spelled attribute React renames (`class`, `for`,
// `tabindex`, `readonly`, `maxlength`, `http-equiv`, `accept-charset`) on an
// intrinsic element. Not reported: the React spelling (`className`,
// `htmlFor`, `tabIndex`, `readOnly`, …) and `data-*`; any attribute on a
// custom element (`<my-widget class="x">`), where React sets attributes as
// written.
// Left out: candidate for change (fires on a guess): the same names on a
// component (`<Label for="x">`), whose props are its own API and may never
// reach the DOM.
module no_invalid_html_attribute {
  type Attr = Class_ | For_ | Tabindex | Readonly | Maxlength | HttpEquiv | AcceptCharset
            | ClassName | HtmlFor | TabIndex | DataRole
  type Elem = Intrinsic | CustomElement

  pure def htmlSpelling(a: Attr): bool =
    Set(Class_, For_, Tabindex, Readonly, Maxlength, HttpEquiv, AcceptCharset).contains(a)
  pure def reports(a: Attr, e: Elem): bool = htmlSpelling(a) and e == Intrinsic

  var attr: Attr
  var elem: Elem
  var verdict: bool

  action step = {
    nondet a = Set(Class_, For_, Tabindex, Readonly, Maxlength, HttpEquiv, AcceptCharset,
                   ClassName, HtmlFor, TabIndex, DataRole).oneOf()
    nondet e = Set(Intrinsic, CustomElement).oneOf()
    all { attr' = a, elem' = e, verdict' = reports(a, e) }
  }

  action init = step
}
