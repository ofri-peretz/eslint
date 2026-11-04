// Model of eslint-plugin-postgresql-security/prefer-pool-query.
// Checking a client out of a pool (`pool.connect()`) to run exactly one query
// and release it is `pool.query()` written long-hand, with a leak waiting in
// every early exit. Reported whether or not the release sits in a `finally`,
// and in the string-subscript spelling (`pool['connect']()`,
// `client['query']`). Not reported: two or more queries on the client, a
// transaction (BEGIN ... COMMIT), and `pool.query()` itself. The pool is any
// `new Pool()` spelling or a handle typed with pg's `Pool`. Files with no
// PostgreSQL import are not judged.
module prefer_pool_query {
  type Receiver =
    | Named | Default | Namespace | Renamed | Require | RequireMember
    | Injected | NoImport
  type Body = Single | SingleNoTry | Bracket | Two | Transaction | PoolDirect

  pure def singleCheckout(b: Body): bool =
    b == Single or b == SingleNoTry or b == Bracket

  pure def reports(r: Receiver, b: Body): bool = r != NoImport and singleCheckout(b)

  var receiver: Receiver
  var body: Body
  var verdict: bool

  action step = {
    nondet r = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Injected,
      NoImport,
    ).oneOf()
    nondet b = Set(Single, SingleNoTry, Bracket, Two, Transaction, PoolDirect).oneOf()
    all { receiver' = r, body' = b, verdict' = reports(r, b) }
  }

  action init = step
}
