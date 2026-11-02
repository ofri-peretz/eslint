// Model of eslint-plugin-browser-security/require-cookie-secure-attrs (CWE-614).
// Contract: a document.cookie write must carry BOTH the Secure and the
// SameSite attribute. Attribute names are case-insensitive (RFC 6265); a cookie
// NAMED "secure" is not the Secure attribute. Non-document receivers are out of scope.
module require_cookie_secure_attrs {
  type Attrs = NoAttrs | SecureOnly | SameSiteOnly | Both | BothLower | NamedSecure
  type Form = Literal | Template | Concat
  type Recv = Doc | WinDoc | Other
  type Ctx = Prod | TestDefault | TestFlipped

  pure def complete(a: Attrs): bool = match a {
    | Both => true
    | BothLower => true
    | _ => false
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(a: Attrs, f: Form, r: Recv, c: Ctx): bool =
    not(skipped(c)) and r != Other and not(complete(a))

  var attrs: Attrs
  var form: Form
  var recv: Recv
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet a = Set(NoAttrs, SecureOnly, SameSiteOnly, Both, BothLower, NamedSecure).oneOf()
    nondet f = Set(Literal, Template, Concat).oneOf()
    nondet r = Set(Doc, WinDoc, Other).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { attrs' = a, form' = f, recv' = r, ctx' = c, verdict' = reports(a, f, r, c) }
  }

  action init = step
}
