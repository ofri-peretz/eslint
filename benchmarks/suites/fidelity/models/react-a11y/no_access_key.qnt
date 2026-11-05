// Model of eslint-plugin-react-a11y/no-access-key (WCAG 2.1.4, 2.4.1).
// An access key on a DOM element binds a single-key shortcut that collides
// with screen-reader and browser shortcuts: setting one is the finding. The
// attribute (React accessKey, HTML accesskey) with a static non-empty value is
// proven; an empty string or {undefined} sets nothing.
// left out: candidate for change (fires on a guess): a dynamic value (may be
// undefined) and custom / member components (the prop may never reach the DOM).
module no_access_key {
  type Elem = Div | Button | Input | Component | Member
  type Value = Lit | Braced | Template | Cond | Dynamic | Empty | Undef
  type AttrName = Camel | Lower
  type Focus = Values | Names

  pure def sets(v: Value): bool = Set(Lit, Braced, Template, Cond).contains(v)
  pure def dom(e: Elem): bool = Set(Div, Button, Input).contains(e)

  var focus: Focus
  var elem: Elem
  var value: Value
  var attrName: AttrName
  var verdict: bool

  action step = {
    nondet fo = Set(Values, Names).oneOf()
    nondet e = (if (fo == Values) Set(Div, Button, Input) else Set(Div)).oneOf()
    nondet v = (if (fo == Values) Set(Lit, Braced, Template, Cond, Empty, Undef) else Set(Lit)).oneOf()
    nondet an = (if (fo == Names) Set(Camel, Lower) else Set(Camel)).oneOf()
    all { focus' = fo, elem' = e, value' = v, attrName' = an, verdict' = (sets(v) and dom(e)) }
  }

  action init = step
}
