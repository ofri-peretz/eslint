// Model of eslint-plugin-postgresql-security/no-batch-insert-loop (CWE-400).
// One round trip per row: the same row-writing statement (INSERT / UPDATE /
// DELETE) executed once per element with that element's values, in a
// `for...of`, an indexed `for`, a `while`, a `forEach`, a `.map()` mapper
// (whatever consumes the array) or an `Array.from(xs, mapper)`, in either
// call spelling (`client.query`, `client['query']`). Not reported: one bulk
// statement (`unnest`), a loop over chunks of an already-batched statement,
// a loop whose statement differs per pass (a migration runner), the identical
// statement repeated with no parameters, reads fanned out in
// `Promise.all(ids.map(...))`, and a single write outside any loop. Files with
// no PostgreSQL import are not judged.
module no_batch_insert_loop {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | NoImport
  type Shape =
    | ForOfInsert | ForIndexUpdate | WhileDelete | ForEachUpdate | MapInsert
    | ArrayFromInsert | BracketInLoop
    | MapSelect | UnnestBulk | ChunkedUnnest | MigrationRunner | NoParamsRepeat
    | SingleInsert

  pure def perRow(s: Shape): bool = match s {
    | ForOfInsert => true
    | ForIndexUpdate => true
    | WhileDelete => true
    | ForEachUpdate => true
    | MapInsert => true
    | ArrayFromInsert => true
    | BracketInLoop => true
    | MapSelect => false
    | UnnestBulk => false
    | ChunkedUnnest => false
    | MigrationRunner => false
    | NoParamsRepeat => false
    | SingleInsert => false
  }

  pure def reports(d: Driver, s: Shape): bool = d != NoImport and perRow(s)

  var driver: Driver
  var shape: Shape
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      NoImport,
    ).oneOf()
    nondet s = Set(
      ForOfInsert, ForIndexUpdate, WhileDelete, ForEachUpdate, MapInsert,
      ArrayFromInsert, BracketInLoop,
      MapSelect, UnnestBulk, ChunkedUnnest, MigrationRunner, NoParamsRepeat,
      SingleInsert,
    ).oneOf()
    all { driver' = d, shape' = s, verdict' = reports(d, s) }
  }

  action init = step
}
