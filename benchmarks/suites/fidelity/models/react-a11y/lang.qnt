// Model of eslint-plugin-react-a11y/lang (WCAG 3.1.1 Language of Page).
// The `lang` of `<html>` must be a well-formed BCP 47 language tag whose
// primary subtag is a language (2-3 letters): `en`, `en-US`, `zh-Hant-TW`.
// `en_US` (underscore is not a BCP 47 separator), `english` (no such primary
// subtag), `e` and `123` are not tags, so assistive technology cannot pick a
// voice. A value the file cannot see (`lang={value}`) is not a finding, and
// neither is a component named `Html`.
// Left out (judgment): `lang` on elements other than `<html>` (the jsx-a11y
// contract checks `<html>` only), and `lang=""` (html-has-lang's finding).
// Left out: candidate for change (fires on a guess): `<Html lang="english">`,
// a component whose DOM the file cannot see; the rule reports it today.
module lang {
  type Tag = En | EnUS | ZhHantTW | Fr | Underscore | Word | OneLetter | Digits | Dyn
  type Spelling = Lit | Braced | Template | Cond

  pure def invalid(t: Tag): bool = Set(Underscore, Word, OneLetter, Digits).contains(t)
  pure def reports(t: Tag): bool = invalid(t)

  var tg: Tag
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet t = Set(En, EnUS, ZhHantTW, Fr, Underscore, Word, OneLetter, Digits, Dyn).oneOf()
    nondet sp = (if (t == Dyn) Set(Lit) else Set(Lit, Braced, Template, Cond)).oneOf()
    all { tg' = t, spelling' = sp, verdict' = reports(t) }
  }

  action init = step
}
