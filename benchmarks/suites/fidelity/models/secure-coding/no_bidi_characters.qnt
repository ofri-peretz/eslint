// Model of eslint-plugin-secure-coding/no-bidi-characters (CWE-1007).
// Contract: any bidi override/embedding/isolate (U+202A-202E, U+2066-2069) is
// reported anywhere in the source: string, template, comment. The directional
// marks U+200E/U+200F are reported unless allowDirectionalMarks. Code points in
// additionalCharacters are reported too. Right-to-left script text (Hebrew) is
// never reported; a non-bidi invisible (U+200B) is not this rule's by default.
module no_bidi_characters {
  type Ch = Rlo | Lre | Lri | Pdi | Lrm | Rlm | HebrewText | Zwsp
  type Where = InString | InComment | InTemplate
  type Opts = Defaults | AllowMarks | AddZwsp

  pure def reports(c: Ch, o: Opts): bool = match c {
    | Rlo => true
    | Lre => true
    | Lri => true
    | Pdi => true
    | Lrm => o != AllowMarks
    | Rlm => o != AllowMarks
    | HebrewText => false
    | Zwsp => o == AddZwsp
  }

  var ch: Ch
  var where: Where
  var opts: Opts
  var verdict: bool

  action step = {
    nondet c = Set(Rlo, Lre, Lri, Pdi, Lrm, Rlm, HebrewText, Zwsp).oneOf()
    nondet w = Set(InString, InComment, InTemplate).oneOf()
    nondet o = Set(Defaults, AllowMarks, AddZwsp).oneOf()
    all { ch' = c, where' = w, opts' = o, verdict' = reports(c, o) }
  }

  action init = step
}
