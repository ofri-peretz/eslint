// Model of eslint-plugin-secure-coding/detect-non-literal-regexp (CWE-400).
// Contract ("Not a finding"): a RegExp pattern is accepted when the file can
// prove it constant: a literal (while allowLiterals, default true), a const-bound
// literal, a concatenation or template of constants, a constant-preserving join
// over a constant array, a loop counter spliced into constants. Anything with
// unresolved provenance reports: a parameter, an import, a config member, a
// reassigned `let`.
module detect_non_literal_regexp {
  type Call = NewRegExp | CallRegExp | NewGlobalThis
  type Pattern = Literal | ConstBound | ConstConcat | ConstTemplate | ConstJoin | LoopCounter
               | Param | Imported | ConfigMember | LetReassigned

  pure def reports(p: Pattern, allowLiterals: bool): bool = match p {
    | Literal => not(allowLiterals)
    | ConstBound => false
    | ConstConcat => false
    | ConstTemplate => false
    | ConstJoin => false
    | LoopCounter => false
    | Param => true
    | Imported => true
    | ConfigMember => true
    | LetReassigned => true
  }

  var call: Call
  var pattern: Pattern
  var allowLiterals: bool
  var verdict: bool

  action step = {
    nondet c = Set(NewRegExp, CallRegExp, NewGlobalThis).oneOf()
    nondet p = Set(Literal, ConstBound, ConstConcat, ConstTemplate, ConstJoin, LoopCounter,
                   Param, Imported, ConfigMember, LetReassigned).oneOf()
    nondet a = (if (p == Literal) Set(true, false) else Set(true)).oneOf()
    all { call' = c, pattern' = p, allowLiterals' = a, verdict' = reports(p, a) }
  }

  action init = step
}
