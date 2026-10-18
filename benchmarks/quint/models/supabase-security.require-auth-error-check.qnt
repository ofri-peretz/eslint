// Model of `supabase-security/require-auth-error-check`: an auth call, how its
// result is bound, and what the code does with it. The contract (rule doc):
// silent when `error` is bound or the result is not destructured, and when the
// identity is checked fail-closed (a falsy guard, an optional chain) or handed
// to a caller; a finding when the result is trusted without either — the
// always-truthy `data` tested, the identity dereferenced or compared with
// `undefined` (null passes that test), or the result never read.
module supabase_security_require_auth_error_check {
  type Method = GetUser | GetSession | GetClaims
  type Binding = IdentityPattern | DataPattern | ThenCallback | WithError | NotDestructured
  type Use = FalsyGuard | ReturnIdentity | OptionalChain | ContainerTest | UndefinedCompare | Deref | Unused

  var method: Method
  var binding: Binding
  var use: Use
  var expected: bool

  pure def failClosed(u: Use): bool = Set(FalsyGuard, ReturnIdentity, OptionalChain).contains(u)

  pure def shouldReport(m: Method, b: Binding, u: Use): bool =
    match b {
      | WithError => false
      | NotDestructured => false
      | _ => not(failClosed(u))
    }

  action init = all {
    nondet method0 = Set(GetUser, GetSession, GetClaims).oneOf()
    nondet binding0 = Set(IdentityPattern, DataPattern, ThenCallback, WithError, NotDestructured).oneOf()
    nondet use0 = Set(FalsyGuard, ReturnIdentity, OptionalChain, ContainerTest, UndefinedCompare, Deref, Unused).oneOf()
    all {
      method' = method0,
      binding' = binding0,
      use' = use0,
      expected' = shouldReport(method0, binding0, use0),
    }
  }

  action step = all {
    method' = method,
    binding' = binding,
    use' = use,
    expected' = expected,
  }
}
