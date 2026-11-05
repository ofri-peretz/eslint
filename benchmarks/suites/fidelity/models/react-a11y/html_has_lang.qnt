// Model of eslint-plugin-react-a11y/html-has-lang (WCAG 3.1.1 Language of Page).
// The `<html>` element must state the page language: a `lang` attribute whose
// value is not empty. No `lang`, `lang=""` and `lang={undefined}` leave the
// page language unknown to a screen reader. A value the file cannot see
// (`lang={value}`) is not a finding. Only the intrinsic `<html>`; a component
// named `Html` is not the document element as far as the file proves.
// Left out: candidate for change (fires on a guess): `<html {...rest}>` with no
// `lang`, where the spread may carry it.
module html_has_lang {
  type Lang = Absent | Empty | Undef | Value | Dyn
  type Spelling = Lit | Braced | Template | Cond
  type Elem = Html | Component

  pure def reports(l: Lang, e: Elem): bool =
    e == Html and Set(Absent, Empty, Undef).contains(l)

  var lang: Lang
  var spelling: Spelling
  var elem: Elem
  var verdict: bool

  action step = {
    nondet l = Set(Absent, Empty, Undef, Value, Dyn).oneOf()
    nondet sp = (if (Set(Empty, Value).contains(l)) Set(Lit, Braced, Template, Cond) else Set(Lit)).oneOf()
    nondet e = Set(Html, Component).oneOf()
    all { lang' = l, spelling' = sp, elem' = e, verdict' = reports(l, e) }
  }

  action init = step
}
