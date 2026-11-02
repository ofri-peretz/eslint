// Model of eslint-plugin-secure-coding/no-homoglyph-identifiers (CWE-1007).
// Contract: (1) an identifier (incl. a private field) mixing an ASCII-lookalike
// Cyrillic/Greek letter with ASCII letters is reported when checkIdentifiers; an
// identifier wholly in one non-Latin script is not. (2) a string literal or
// template chunk is reported, when checkStrings, only for an invisible character
// (U+200B-200F, U+202A-202E, ...) written raw next to visible ASCII. Visible
// non-ASCII text, a homoglyph inside a string, an escape (​), and a joiner
// between non-ASCII letters are not reported.
module no_homoglyph_identifiers {
  type Kind = IdentCyrMixed | IdentGreekMixed | IdentAllCyr | PrivCyrMixed
            | StrZwspAscii | StrRloAscii | StrZwnjPersian | StrEscaped
            | StrCyrText | StrHomoglyph | TplZwspAscii

  pure def isIdent(k: Kind): bool = Set(IdentCyrMixed, IdentGreekMixed, IdentAllCyr, PrivCyrMixed).contains(k)

  pure def reports(k: Kind, checkIds: bool, checkStrs: bool): bool =
    if (isIdent(k)) checkIds and k != IdentAllCyr
    else checkStrs and Set(StrZwspAscii, StrRloAscii, TplZwspAscii).contains(k)

  var kind: Kind
  var checkIds: bool
  var checkStrs: bool
  var verdict: bool

  action step = {
    nondet k = Set(IdentCyrMixed, IdentGreekMixed, IdentAllCyr, PrivCyrMixed, StrZwspAscii, StrRloAscii,
                   StrZwnjPersian, StrEscaped, StrCyrText, StrHomoglyph, TplZwspAscii).oneOf()
    nondet i = Set(true, false).oneOf()
    nondet s = Set(true, false).oneOf()
    all { kind' = k, checkIds' = i, checkStrs' = s, verdict' = reports(k, i, s) }
  }

  action init = step
}
