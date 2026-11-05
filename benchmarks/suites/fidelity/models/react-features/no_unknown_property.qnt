// Model of eslint-plugin-react-features/no-unknown-property.
// On a host (DOM) element React expects its own property names: an HTML or
// SVG attribute written the HTML way — `class`, `for`, `tabindex`,
// `stroke-width` — where React's name differs (`className`, `htmlFor`,
// `tabIndex`, `strokeWidth`) is reported. React's names, `data-*` and
// `aria-*` attributes, event handlers and React's own props (`key`,
// `suppressHydrationWarning`) are silent. A component (`<Card>`, `<Ui.div>`)
// takes any prop, and a custom element (`<my-widget>`, hyphenated as HTML
// requires) defines its own attributes: both are silent.
// Left out (judgment): an attribute name React does not know at all
// (`<div foo>`): React 16+ passes it through to the DOM, so whether it is a
// mistake is not decided by the code. Also namespaced names (`xlink:href`).
module no_unknown_property {
  type Elem = Div | Label | Svg | Comp | Member | Custom
  type Prop = ClassName | ClassHtml | HtmlFor | ForHtml | TabIndex | TabIndexLower | DataAttr
            | AriaAttr | OnClick | StrokeWidth | StrokeDash | Key | SuppressHydration

  pure def host(e: Elem): bool = Set(Div, Label, Svg).contains(e)
  pure def htmlSpelling(p: Prop): bool = Set(ClassHtml, ForHtml, TabIndexLower, StrokeDash).contains(p)
  pure def reports(e: Elem, p: Prop): bool = host(e) and htmlSpelling(p)

  var elem: Elem
  var prop: Prop
  var verdict: bool

  action step = {
    nondet e = Set(Div, Label, Svg, Comp, Member, Custom).oneOf()
    nondet p = Set(ClassName, ClassHtml, HtmlFor, ForHtml, TabIndex, TabIndexLower, DataAttr,
                   AriaAttr, OnClick, StrokeWidth, StrokeDash, Key, SuppressHydration).oneOf()
    all { elem' = e, prop' = p, verdict' = reports(e, p) }
  }

  action init = step
}
