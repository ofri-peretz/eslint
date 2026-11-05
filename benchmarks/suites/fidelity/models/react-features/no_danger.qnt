// Model of eslint-plugin-react-features/no-danger (CWE-79).
// Setting `dangerouslySetInnerHTML` on a DOM element bypasses React's escaping
// and is reported, written as a JSX attribute or as the prop object of
// `React.createElement('div', …)` (any spelling of React's `createElement`,
// identifier or quoted key). The same element without the prop is the safe
// twin; a lowercase `dangerouslysetinnerhtml` is not React's prop (React sets
// it as a plain attribute), and a `createElement` the file declares itself is
// not React's.
// Left out: candidate for change (fires on a guess): the prop on a component
// (`<Markdown dangerouslySetInnerHTML={…} />`), which may never reach the DOM.
// Left out (judgment): a constant `__html` string literal, which cannot carry
// injected markup; the rule's documented contract reports every use.
module no_danger {
  type Form = Jsx | CeNamed | CeDefault | CeComputed | CeShadowed
  type Prop = Present | QuotedKey | Absent | Lowercase

  pure def isReact(f: Form): bool = f != CeShadowed
  pure def reports(f: Form, p: Prop): bool =
    isReact(f) and (p == Present or p == QuotedKey)

  var form: Form
  var prop: Prop
  var verdict: bool

  action step = {
    nondet f = Set(Jsx, CeNamed, CeDefault, CeComputed, CeShadowed).oneOf()
    nondet p = Set(Present, QuotedKey, Absent, Lowercase).oneOf()
    all { form' = f, prop' = p, verdict' = reports(f, p) }
  }

  action init = step
}
