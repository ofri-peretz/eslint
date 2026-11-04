// Model of eslint-plugin-postgresql-security/no-missing-client-release (CWE-772).
// A client checked out with `pool.connect()` and not given back on some path
// out of the function leaks a pool slot until the pool is exhausted. Reported:
// no release at all, an early `return` before the release, a release only in
// a `catch` (the success path leaks), a function that owns a transaction
// (runs BEGIN/COMMIT itself) and lends the client to a helper but never
// releases, and the string-subscript spelling `pool['connect']()`. Safe: a
// release in `finally`, a release right after a `try` whose catch swallows,
// an early return that releases first, `client['release']()`,
// `release(true)`, and a client handed wholesale to a helper that runs no
// query here (the helper owns it). The pool is any `new Pool()` spelling, a
// handle typed `Pool`, or any `.connect()` whose result runs `.query()`.
// Files with no PostgreSQL import are not judged.
module no_missing_client_release {
  type Receiver =
    | Named | Default | Namespace | Renamed | Require | RequireMember
    | Injected | Duck | NoImport
  type Body =
    | NoRelease | EarlyReturnLeak | CatchOnly | OwnerLends | BracketConnectLeak
    | ReleaseFinally | ReleaseAfterTry | EarlyReturnReleased | HandedOff
    | BracketRelease | ReleaseDestroy

  pure def leaks(b: Body): bool = match b {
    | NoRelease => true
    | EarlyReturnLeak => true
    | CatchOnly => true
    | OwnerLends => true
    | BracketConnectLeak => true
    | ReleaseFinally => false
    | ReleaseAfterTry => false
    | EarlyReturnReleased => false
    | HandedOff => false
    | BracketRelease => false
    | ReleaseDestroy => false
  }

  pure def reports(r: Receiver, b: Body): bool = r != NoImport and leaks(b)

  var receiver: Receiver
  var body: Body
  var verdict: bool

  action step = {
    nondet r = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Injected,
      Duck, NoImport,
    ).oneOf()
    nondet b = Set(
      NoRelease, EarlyReturnLeak, CatchOnly, OwnerLends, BracketConnectLeak,
      ReleaseFinally, ReleaseAfterTry, EarlyReturnReleased, HandedOff,
      BracketRelease, ReleaseDestroy,
    ).oneOf()
    all { receiver' = r, body' = b, verdict' = reports(r, b) }
  }

  action init = step
}
