// Model of eslint-plugin-browser-security/require-blob-url-revocation (CWE-401).
// Contract: a URL.createObjectURL() result must be revoked with
// URL.revokeObjectURL(<that url>) in the same file. A result never bound to a
// name cannot be revoked; revoking some OTHER url does not count.
module require_blob_url_revocation {
  type Create = UrlCreate | WindowUrlCreate
  type Binding = Const | Direct
  type Revoke = NoRevoke | RevokeInCallback | RevokeImmediate | RevokeOther
  type Scope = TopLevel | InLoop
  type Ctx = Prod | TestDefault | TestFlipped

  pure def revokesIt(b: Binding, r: Revoke): bool =
    b == Const and (r == RevokeInCallback or r == RevokeImmediate)

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(k: Create, b: Binding, r: Revoke, s: Scope, c: Ctx): bool =
    not(skipped(c)) and not(revokesIt(b, r))

  var create: Create
  var binding: Binding
  var revoke: Revoke
  var scope: Scope
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet k = Set(UrlCreate, WindowUrlCreate).oneOf()
    nondet b = Set(Const, Direct).oneOf()
    nondet r = Set(NoRevoke, RevokeInCallback, RevokeImmediate, RevokeOther).oneOf()
    nondet s = Set(TopLevel, InLoop).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { create' = k, binding' = b, revoke' = r, scope' = s, ctx' = c, verdict' = reports(k, b, r, s, c) }
  }

  action init = step
}
