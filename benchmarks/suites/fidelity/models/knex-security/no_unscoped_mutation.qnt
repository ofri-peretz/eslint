// Model of eslint-plugin-knex-security/no-unscoped-mutation (CWE-284).
// A knex `del()` / `delete()` / `update(values)` with no `where*()` clause
// in its chain rewrites or deletes every row in the table. `update`'s
// argument is the values, never a filter, and `returning()` / `limit()` do
// not scope a write. Every spelling of the where family scopes it (`where`,
// `whereIn`, `whereRaw`, `andWhere`, `orWhere`, `whereNull`, ...), and so
// does scope added by another statement (`if (id) q.where(...)`) or a helper
// the builder is handed to, since the rule only reports what it can prove.
// Judged on a table builder (`db('users')`, `.from('users')`,
// `.table('users')`, a transaction's `trx('users')`, a quoted member) under
// every import spelling, and on an untraceable handle whose chain names its
// table. Not judged: a file with no knex, a `Map`, an untraceable
// non-builder receiver, a migration's `up` / `down`, a seed's `seed`, and
// test files.
module no_unscoped_mutation {
  type Receiver =
    | Default | From | Table | Trx | Bracket | NamedImport | RequireCall
    | UntracedTable | UntracedPlain | MapDelete | NoImport | Migration | Seed
    | InTest
  type Verb = Del | Delete | Update
  type Scope =
    | NoScope | Where | WhereIn | WhereRaw | AndWhere | OrWhere | WhereNull
    | Returning | Limit | Conditional | Helper

  pure def unscoped(s: Scope): bool = Set(NoScope, Returning, Limit).contains(s)

  pure def judged(r: Receiver): bool = not(Set(
    UntracedPlain, MapDelete, NoImport, Migration, Seed, InTest,
  ).contains(r))

  // A Map only deletes, and neither it nor a plain object has a builder chain.
  pure def applies(r: Receiver, v: Verb, s: Scope): bool =
    if (r == MapDelete) v == Delete and s == NoScope
    else if (r == UntracedPlain) s == NoScope
    else true

  pure def reports(r: Receiver, s: Scope): bool = judged(r) and unscoped(s)

  var receiver: Receiver
  var verb: Verb
  var scope: Scope
  var verdict: bool

  action step = {
    nondet r = Set(
      Default, From, Table, Trx, Bracket, NamedImport, RequireCall,
      UntracedTable, UntracedPlain, MapDelete, NoImport, Migration, Seed,
      InTest,
    ).oneOf()
    nondet v = Set(Del, Delete, Update)
      .filter(x => r != MapDelete or x == Delete).oneOf()
    nondet s = Set(
      NoScope, Where, WhereIn, WhereRaw, AndWhere, OrWhere, WhereNull,
      Returning, Limit, Conditional, Helper,
    ).filter(x => applies(r, v, x)).oneOf()
    all { receiver' = r, verb' = v, scope' = s, verdict' = reports(r, s) }
  }

  action init = step
}
