// Model of eslint-plugin-postgresql-security/no-transaction-on-pool (CWE-362).
// `pool.query()` checks out a possibly different connection for every call,
// so a transaction command sent through the pool (`BEGIN`, `START
// TRANSACTION`, `COMMIT`, `ROLLBACK`, in any case, with an isolation level,
// as a static template) opens or ends a transaction on a connection the next
// statement may never see. The receiver is a pool however it is reached: a
// `new Pool()` in any import spelling, a string-subscript `pool['query']`, an
// alias `const db = pool`, or a handle declared with pg's `Pool` type (an
// injected pool). Safe: the same commands on a `new Client()` or on a client
// checked out with `pool.connect()` (one connection), and statements that are
// not transaction control (`SELECT begin_at ...`). Files with no PostgreSQL
// import are not judged.
module no_transaction_on_pool {
  type Receiver =
    | Named | Default | Namespace | Renamed | Require | RequireMember
    | SinkBracket | Alias | Injected | Client | CheckedOut | NoImport
  type Cmd =
    | Begin | StartTx | Commit | Rollback | Lower | Isolation | TemplateBegin
    | Select | BeginColumn

  pure def isPool(r: Receiver): bool =
    r != Client and r != CheckedOut and r != NoImport

  pure def txControl(c: Cmd): bool = c != Select and c != BeginColumn

  pure def reports(r: Receiver, c: Cmd): bool = isPool(r) and txControl(c)

  var receiver: Receiver
  var cmd: Cmd
  var verdict: bool

  action step = {
    nondet r = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember,
      SinkBracket, Alias, Injected, Client, CheckedOut, NoImport,
    ).oneOf()
    nondet c = Set(
      Begin, StartTx, Commit, Rollback, Lower, Isolation, TemplateBegin,
      Select, BeginColumn,
    ).oneOf()
    all { receiver' = r, cmd' = c, verdict' = reports(r, c) }
  }

  action init = step
}
