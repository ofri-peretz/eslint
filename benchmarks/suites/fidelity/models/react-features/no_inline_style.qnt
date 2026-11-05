// Model of eslint-plugin-react-features/component-api/no-inline-style (R18).
// Static styling belongs in Tailwind classes. Reported: `style={{ … }}` on a
// DOM element with at least one property whose key is a CSS property (not a
// `--custom-property`) and whose value is a static string or number however
// it is written: `'10px'`, `100`, `-1`, a no-placeholder template, and with
// the key as an identifier, quoted or a static computed key. Not reported:
// a CSS-variable key, a key chosen at runtime, a value that varies (an
// identifier, a template with a placeholder), `undefined` (no style).
// A choice between two static values (`flag ? '1px' : '2px'`) is a judgment
// call (the value does vary at runtime): silent.
// Left out: candidate for change (fires on a guess): `style` on a component
// (`<Box style={{ … }} />`), whose `style` prop may not be CSS at all.
module no_inline_style {
  type Key = Ident | Quoted | ComputedStatic | CssVar | ComputedDyn
  type Val = Str | Num | Neg | Tmpl | TmplExpr | Ident2 | Cond | Undef
  type Companion = Alone | WithDynamic

  pure def reports(k: Key, v: Val, c: Companion): bool =
    Set(Ident, Quoted, ComputedStatic).contains(k) and Set(Str, Num, Neg, Tmpl).contains(v)

  var key: Key
  var value: Val
  var companion: Companion
  var verdict: bool

  action step = {
    nondet k = Set(Ident, Quoted, ComputedStatic, CssVar, ComputedDyn).oneOf()
    nondet v = Set(Str, Num, Neg, Tmpl, TmplExpr, Ident2, Cond, Undef).oneOf()
    nondet c = Set(Alone, WithDynamic).oneOf()
    all { key' = k, value' = v, companion' = c, verdict' = reports(k, v, c) }
  }

  action init = step
}
