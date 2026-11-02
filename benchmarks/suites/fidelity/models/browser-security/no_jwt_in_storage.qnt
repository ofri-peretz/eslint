// Model of eslint-plugin-browser-security/no-jwt-in-storage (CWE-922).
// Contract: a write to localStorage/sessionStorage is reported when the key
// names a bearer credential (whole word of `bearerPatterns`, after splitting on
// _ - . and case boundaries) or the value is a JWT literal. Facts about a
// credential (tokenCount, sessionTimeout) and words that merely contain a
// pattern (tokenizer, author) are not credentials. Other receivers are out of scope.
module no_jwt_in_storage {
  // Test-file context: Prod is src/a.ts, TestDefault a test file under the
  // default options, TestFlipped a test file with allowInTests set opposite to
  // its default. Outside Prod every dimension but the key is pinned to one
  // representative, so the option is covered on tainted and safe inputs
  // without multiplying the domain.
  type Ctx = Prod | TestDefault | TestFlipped

  pure def skipped(c: Ctx): bool = c == TestDefault
  type Key =
    | Token | AccessTokenCamel | AccessTokenSnake | IdToken | Jwt | AuthToken
    | Tokenizer | Author | TokenCount | SessionTimeout | Theme | Handle
  type Value = Ident | JwtLit | PlainLit
  type Form = SetItem | Bracket | Dot | SessionSetItem | OtherReceiver
  type Patterns = DefaultBearer | CustomHandle

  pure def bearerKey(k: Key, p: Patterns): bool = match p {
    | DefaultBearer => match k {
        | Token => true
        | AccessTokenCamel => true
        | AccessTokenSnake => true
        | IdToken => true
        | Jwt => true
        | AuthToken => true
        | _ => false
      }
    | CustomHandle => k == Handle
  }

  pure def storageWrite(f: Form): bool = f != OtherReceiver

  pure def reports(k: Key, v: Value, f: Form, p: Patterns): bool =
    storageWrite(f) and (bearerKey(k, p) or v == JwtLit)

  var key: Key
  var value: Value
  var form: Form
  var patterns: Patterns
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    nondet k = Set(Token, AccessTokenCamel, AccessTokenSnake, IdToken, Jwt, AuthToken, Tokenizer, Author, TokenCount, SessionTimeout, Theme, Handle).oneOf()
    nondet v0 = Set(Ident, JwtLit, PlainLit).oneOf()
    nondet f0 = Set(SetItem, Bracket, Dot, SessionSetItem, OtherReceiver).oneOf()
    nondet p0 = Set(DefaultBearer, CustomHandle).oneOf()
    val v = if (x == Prod) v0 else Ident
    val f = if (x == Prod) f0 else SetItem
    val p = if (x == Prod) p0 else DefaultBearer
    all {
      key' = k, value' = v, form' = f, patterns' = p, ctx' = x,
      verdict' = (not(skipped(x)) and reports(k, v, f, p)),
    }
  }

  action init = step
}
