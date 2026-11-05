// Model of eslint-plugin-react-features/no-danger-with-children.
// React throws ("Can only set one of `children` or
// `props.dangerouslySetInnerHTML`") when a DOM element gets both a non-null
// `dangerouslySetInnerHTML` and non-null children. Children are JSX content
// (text, a single space, an element, an expression), a `children` prop, or
// `createElement`'s third argument. Not children: no content, whitespace that
// JSX drops (a line break only), `{undefined}`, `children={undefined}`.
// `dangerouslySetInnerHTML={undefined}` is not set. Both via JSX and via any
// spelling of React's `createElement`; a `createElement` the file declares
// itself is not React's.
// Left out: candidate for change (fires on a guess): a component
// (`<Html dangerouslySetInnerHTML children>`), whose props may never reach
// the DOM, and a spread that may carry either prop.
module no_danger_with_children {
  type Form = Jsx | CeNamed | CeDefault | CeShadowed
  type Kids = NoKids | Text | Space | Element | Expr | Undef | Newline | ChildrenProp
            | ChildrenUndef | ThirdArg | ThirdUndef
  type Danger = Set_ | Unset | DangerUndef

  pure def hasKids(k: Kids): bool =
    Set(Text, Space, Element, Expr, ChildrenProp, ThirdArg).contains(k)
  pure def reports(f: Form, k: Kids, d: Danger): bool =
    f != CeShadowed and hasKids(k) and d == Set_

  var form: Form
  var kids: Kids
  var danger: Danger
  var verdict: bool

  action step = {
    nondet f = Set(Jsx, CeNamed, CeDefault, CeShadowed).oneOf()
    nondet k = (if (f == Jsx)
                  Set(NoKids, Text, Space, Element, Expr, Undef, Newline, ChildrenProp,
                      ChildrenUndef)
                else Set(NoKids, ChildrenProp, ChildrenUndef, ThirdArg, ThirdUndef)).oneOf()
    nondet d = Set(Set_, Unset, DangerUndef).oneOf()
    all { form' = f, kids' = k, danger' = d, verdict' = reports(f, k, d) }
  }

  action init = step
}
