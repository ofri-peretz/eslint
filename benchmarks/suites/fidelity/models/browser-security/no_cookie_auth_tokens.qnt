// Model of eslint-plugin-browser-security/no-cookie-auth-tokens (CWE-1004).
// Contract: assigning document.cookie a cookie whose NAME is a bearer
// credential (whole word of `bearerPatterns`, split on _ - . and case
// boundaries; the option replaces the vocabulary) is reported. Facts about a
// credential (tokenCount) and words merely containing a pattern (author) are not.
module no_cookie_auth_tokens {
  type Name =
    | AuthToken | Jwt | Bearer | SessionId | SessionIdSnake | Sid | AccessToken
    | Theme | Locale | TokenCount | Author | Handle
  type Form = Literal | Concat | Template
  type Recv = Doc | WinDoc | Other
  type Patterns = DefaultBearer | CustomHandle
  type Ctx = Prod | TestDefault | TestFlipped

  pure def bearer(n: Name, p: Patterns): bool = match p {
    | DefaultBearer => match n {
        | AuthToken => true
        | Jwt => true
        | Bearer => true
        | SessionId => true
        | SessionIdSnake => true
        | Sid => true
        | AccessToken => true
        | _ => false
      }
    | CustomHandle => n == Handle
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(n: Name, f: Form, r: Recv, p: Patterns, c: Ctx): bool =
    not(skipped(c)) and r != Other and bearer(n, p)

  var name: Name
  var form: Form
  var recv: Recv
  var patterns: Patterns
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet n = Set(AuthToken, Jwt, Bearer, SessionId, SessionIdSnake, Sid, AccessToken, Theme, Locale, TokenCount, Author, Handle).oneOf()
    nondet f = Set(Literal, Concat, Template).oneOf()
    nondet r = Set(Doc, WinDoc, Other).oneOf()
    nondet p = Set(DefaultBearer, CustomHandle).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { name' = n, form' = f, recv' = r, patterns' = p, ctx' = c, verdict' = reports(n, f, r, p, c) }
  }

  action init = step
}
