// Model of eslint-plugin-supabase-security/require-auth-error-check (CWE-287).
// `auth.getUser()` (and getSession, getClaims, refreshSession,
// exchangeCodeForSession) never throws on a missing or forged token: it
// resolves `{ data: { user: null }, error }`. A destructuring of the result,
// in a declaration or a `.then()` callback parameter, that does not bind
// `error` (by name, renamed, quoted, a rest element, or a computed key, which
// abstains) is then judged by what it does with the identity (`user`,
// `session`, `claims`, bound directly or read as `data.<identity>`):
//   fail-closed, silent — the identity checked by a branch, a short-circuit or
//     an optional chain, or handed on (returned, passed to a call);
//   reported — the always-truthy `data` tested, the identity dereferenced
//     unchecked (a strict `!== undefined` is no check: failure yields null),
//     or the result never read.
// The call is sampled as `db.auth.getUser()` and `db['auth']['getUser']()`.
// Files with no `@supabase/*` import are not judged.
module require_auth_error_check {
  type Spelling = Named | Renamed | Require | Namespace | Ssr | Bracket | NoImport
  type Method = GetUser | GetSession | GetClaims | RefreshSession | ExchangeCode
  type Form = Await | Then
  type Use =
    | BindError | BindErrorRenamed | BindErrorQuoted | BindRest | BindComputed
    | Guard | DataGuard | OptionalChain | ShortCircuit | Returned | Passed
    | DataTruthy | StrictUndefined | Unchecked | DataDeref | NeverRead

  pure def trusted(u: Use): bool = match u {
    | BindError => false
    | BindErrorRenamed => false
    | BindErrorQuoted => false
    | BindRest => false
    | BindComputed => false
    | Guard => false
    | DataGuard => false
    | OptionalChain => false
    | ShortCircuit => false
    | Returned => false
    | Passed => false
    | DataTruthy => true
    | StrictUndefined => true
    | Unchecked => true
    | DataDeref => true
    | NeverRead => true
  }

  pure def reports(sp: Spelling, u: Use): bool = sp != NoImport and trusted(u)

  var spelling: Spelling
  var method: Method
  var form: Form
  var use: Use
  var verdict: bool

  action step = {
    nondet sp = Set(Named, Renamed, Require, Namespace, Ssr, Bracket, NoImport).oneOf()
    nondet m = Set(GetUser, GetSession, GetClaims, RefreshSession, ExchangeCode).oneOf()
    nondet f = Set(Await, Then).oneOf()
    nondet u = Set(
      BindError, BindErrorRenamed, BindErrorQuoted, BindRest, BindComputed,
      Guard, DataGuard, OptionalChain, ShortCircuit, Returned, Passed,
      DataTruthy, StrictUndefined, Unchecked, DataDeref, NeverRead,
    ).oneOf()
    all {
      spelling' = sp, method' = m, form' = f, use' = u,
      verdict' = reports(sp, u),
    }
  }

  action init = step
}
