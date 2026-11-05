// Model of eslint-plugin-react-features/void-dom-elements-no-children.
// A void HTML element (`area base br col embed hr img input link meta source
// track wbr`, as the HTML spec defines them) can never have content; React
// throws when one is given children. Reported when an intrinsic void element
// gets content: a text or expression child, a `children` prop, or
// `dangerouslySetInnerHTML`, in JSX or through React's `createElement`
// (however React is imported). A self-closing or empty pair, a comment-only
// expression, a non-void element and a component (`<Img>`, `createElement(Img)`)
// are silent; so is a local function named `createElement`.
// Left out: whitespace-only content and `{undefined}` (React drops them), and
// the obsolete `keygen` / `menuitem` / `param`.
module void_dom_elements_no_children {
  type Elem = Br | Img | Input | Hr | Wbr | Meta | Div | Comp
  type Form = SelfClose | EmptyPair | Comment | Text | Expr | ChildrenProp | Danger
            | CeNone | CeText | CeChildrenProp | CeDanger
  type Spelling = Jsx | Named | Default | Shadowed
  type Focus = JsxForms | CeForms

  pure def isVoid(e: Elem): bool = Set(Br, Img, Input, Hr, Wbr, Meta).contains(e)
  pure def hasContent(f: Form): bool =
    Set(Text, Expr, ChildrenProp, Danger, CeText, CeChildrenProp, CeDanger).contains(f)
  pure def reports(e: Elem, f: Form, sp: Spelling): bool =
    isVoid(e) and hasContent(f) and sp != Shadowed

  var focus: Focus
  var elem: Elem
  var form: Form
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet fo = Set(JsxForms, CeForms).oneOf()
    nondet e = Set(Br, Img, Input, Hr, Wbr, Meta, Div, Comp).oneOf()
    nondet f = (if (fo == JsxForms)
                  Set(SelfClose, EmptyPair, Comment, Text, Expr, ChildrenProp, Danger)
                else Set(CeNone, CeText, CeChildrenProp, CeDanger)).oneOf()
    nondet sp = (if (fo == JsxForms) Set(Jsx) else Set(Named, Default, Shadowed)).oneOf()
    all { focus' = fo, elem' = e, form' = f, spelling' = sp, verdict' = reports(e, f, sp) }
  }

  action init = step
}
