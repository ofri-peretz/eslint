// Model of eslint-plugin-postgresql-security/no-floating-query (CWE-252).
// A pg `query()` whose promise is dropped on the floor (an expression
// statement nobody awaits, chains or keeps) fails silently: the rejection is
// unhandled and the write may never have happened. Handled: `await`, a
// `.catch()` chain, a `.then(ok, fail)` with a rejection handler, a promise
// kept in a variable and awaited later, one returned to the caller, one
// passed to `Promise.all`, and the callback API (node-postgres returns no
// promise when given a callback). `void` is the explicit opt-out. A
// supertest/superagent `.query({ ... })` is a query-string builder, not pg.
// Files with no PostgreSQL import are not judged.
module no_floating_query {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | SinkBracket | NoImport
  type Use =
    | Floating | FloatingThen
    | Awaited | Caught | ThenWithReject | Assigned | Returned | PromiseAll
    | Callback | VoidOptOut | Supertest

  pure def floats(u: Use): bool = match u {
    | Floating => true
    | FloatingThen => true
    | Awaited => false
    | Caught => false
    | ThenWithReject => false
    | Assigned => false
    | Returned => false
    | PromiseAll => false
    | Callback => false
    | VoidOptOut => false
    | Supertest => false
  }

  pure def reports(d: Driver, u: Use): bool = d != NoImport and floats(u)

  var driver: Driver
  var use: Use
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      SinkBracket, NoImport,
    ).oneOf()
    nondet u = Set(
      Floating, FloatingThen,
      Awaited, Caught, ThenWithReject, Assigned, Returned, PromiseAll,
      Callback, VoidOptOut, Supertest,
    ).oneOf()
    all { driver' = d, use' = u, verdict' = reports(d, u) }
  }

  action init = step
}
