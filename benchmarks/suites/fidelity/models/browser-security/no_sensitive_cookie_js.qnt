// Model of eslint-plugin-browser-security/no-sensitive-cookie-js (CWE-359).
// Contract: assigning document.cookie a cookie whose NAME is a sensitive term
// (`sensitivePatterns`, which the option replaces) is reported, whatever the
// attributes. Bearer names (token, sessionId) are deferred to
// no-cookie-auth-tokens per the documented partition. Non-document receivers
// are out of scope.
module no_sensitive_cookie_js {
  type Name = Password | ApiKey | ClientSecret | Token | SessionId | Theme | Pin
  type Form = Literal | Concat | Template
  type Recv = Doc | WinDoc | Other
  type Patterns = DefaultPatterns | CustomPin
  type Ctx = Prod | TestDefault | TestFlipped

  pure def sensitive(n: Name, p: Patterns): bool = match p {
    | DefaultPatterns => match n {
        | Password => true
        | ApiKey => true
        | ClientSecret => true
        | _ => false
      }
    | CustomPin => n == Pin
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(n: Name, f: Form, r: Recv, p: Patterns, c: Ctx): bool =
    not(skipped(c)) and r != Other and sensitive(n, p)

  var name: Name
  var form: Form
  var recv: Recv
  var patterns: Patterns
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet n = Set(Password, ApiKey, ClientSecret, Token, SessionId, Theme, Pin).oneOf()
    nondet f = Set(Literal, Concat, Template).oneOf()
    nondet r = Set(Doc, WinDoc, Other).oneOf()
    nondet p = Set(DefaultPatterns, CustomPin).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { name' = n, form' = f, recv' = r, patterns' = p, ctx' = c, verdict' = reports(n, f, r, p, c) }
  }

  action init = step
}
