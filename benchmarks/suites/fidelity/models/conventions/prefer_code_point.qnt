// Model of eslint-plugin-conventions/prefer-code-point.
// `charCodeAt()` reads one UTF-16 unit and splits astral characters;
// `codePointAt()` reads the whole code point. The rule reports a call of a
// `charCodeAt` method in every spelling: dotted, string subscript, optional
// call, a non-null receiver, a literal receiver. It does not report
// `codePointAt`, a method chosen by a runtime key, or a local function that
// happens to be called `charCodeAt`. The rule has no options (the schema is
// an empty object).
module prefer_code_point {
  type Spelling = Dot | Subscript | Optional | NonNull | LiteralReceiver
    | CodePoint | DynamicKey | BareFunction

  pure def reports(s: Spelling): bool =
    Set(Dot, Subscript, Optional, NonNull, LiteralReceiver).contains(s)

  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet s = Set(Dot, Subscript, Optional, NonNull, LiteralReceiver,
                   CodePoint, DynamicKey, BareFunction).oneOf()
    all { spelling' = s, verdict' = reports(s) }
  }

  action init = step
}
