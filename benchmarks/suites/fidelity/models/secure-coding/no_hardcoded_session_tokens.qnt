// Model of eslint-plugin-secure-coding/no-hardcoded-session-tokens (CWE-798).
module no_hardcoded_session_tokens {
  type Lit = Jwt | Bearer | AlnumLong | AlnumShort | Plain
  type Ctx = TokenVar | NeutralVar | NotDecl

  // Reports a string literal in context. AlnumLong (>=16 alnum) is judged only
  // when assigned to a variable whose name mentions session or token.
  pure def reports(l: Lit, c: Ctx): bool = match l {
    | Jwt => true
    | Bearer => true
    | AlnumLong => c == TokenVar
    | AlnumShort => false
    | Plain => false
  }

  var lit: Lit
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet l = Set(Jwt, Bearer, AlnumLong, AlnumShort, Plain).oneOf()
    nondet c = Set(TokenVar, NeutralVar, NotDecl).oneOf()
    all {
      lit' = l,
      ctx' = c,
      verdict' = reports(l, c),
    }
  }

  action init = step
}
