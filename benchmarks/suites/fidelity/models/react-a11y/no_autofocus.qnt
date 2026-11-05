// Model of eslint-plugin-react-a11y/no-autofocus (WCAG 2.4.3, 3.2.1).
// Autofocus moves focus on load, disorienting screen-reader and keyboard
// users. A static truthy autoFocus (bare, {true}, "true") -- or the HTML
// `autofocus` spelling -- is the finding. autoFocus={false} and {undefined}
// do not focus. Custom
// components are checked by default (the prop conventionally forwards) and
// exempt with `ignoreNonDOM: true`.
// left out: candidate for change (fires on a guess): a dynamic value (may be
// false).
module no_autofocus {
  type Elem = Input | Div | Button | Component | Member
  type Value = Bare | BracedTrue | LitTrue | BracedFalse | Dynamic | Undef
  type Opt = Default | IgnoreNonDOM
  type AttrName = Camel | Lower
  type Focus = Values | Names

  pure def focuses(v: Value): bool = Set(Bare, BracedTrue, LitTrue).contains(v)
  pure def checked(e: Elem, o: Opt): bool = Set(Input, Div, Button).contains(e) or o == Default

  var focus: Focus
  var elem: Elem
  var value: Value
  var opt: Opt
  var attrName: AttrName
  var verdict: bool

  action step = {
    nondet fo = Set(Values, Names).oneOf()
    nondet e = (if (fo == Values) Set(Input, Div, Button, Component, Member) else Set(Input)).oneOf()
    nondet v = (if (fo == Values) Set(Bare, BracedTrue, LitTrue, BracedFalse, Undef) else Set(Bare)).oneOf()
    nondet o = (if (fo == Values) Set(Default, IgnoreNonDOM) else Set(Default)).oneOf()
    nondet an = (if (fo == Names) Set(Camel, Lower) else Set(Camel)).oneOf()
    all { focus' = fo, elem' = e, value' = v, opt' = o, attrName' = an,
          verdict' = (focuses(v) and checked(e, o)) }
  }

  action init = step
}
