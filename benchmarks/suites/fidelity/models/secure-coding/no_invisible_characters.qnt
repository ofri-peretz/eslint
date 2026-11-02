// Model of eslint-plugin-secure-coding/no-invisible-characters (CWE-1007).
// Contract: exactly six invisible letters (U+115F, U+1160, U+17B4, U+17B5,
// U+3164, U+FFA0) written raw are reported anywhere: identifier, string,
// template, regex, comment. A visible neighbour letter (U+3131), the same
// character written as an escape, and siblings' characters (U+200B) are not.
module no_invisible_characters {
  type Ch = C115F | C1160 | C17B4 | C17B5 | C3164 | CFFA0 | Visible3131 | Escaped3164 | Zwsp
  type Where = Identifier | StringLit | TemplateLit | RegexLit | Comment

  pure def reports(c: Ch): bool = Set(C115F, C1160, C17B4, C17B5, C3164, CFFA0).contains(c)

  var ch: Ch
  var where: Where
  var verdict: bool

  action step = {
    nondet c = Set(C115F, C1160, C17B4, C17B5, C3164, CFFA0, Visible3131, Escaped3164, Zwsp).oneOf()
    nondet w = (if (c == Zwsp) Set(StringLit, TemplateLit, RegexLit, Comment)
                else Set(Identifier, StringLit, TemplateLit, RegexLit, Comment)).oneOf()
    all { ch' = c, where' = w, verdict' = reports(c) }
  }

  action init = step
}
