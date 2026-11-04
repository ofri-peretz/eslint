// Model of eslint-plugin-drizzle-security/no-unscoped-mutation (CWE-284).
// Drizzle's `delete(table)` / `update(table).set(...)` builders take the
// table, never a filter: the scope always arrives as a chained `.where()`.
// Without one the statement touches every row (`.returning()` and `.set()`
// are not filters): reported. A chained `.where()`, including one whose
// condition is a variable the file cannot read, or one added later to the
// builder held in a variable, is scoped. A `Map#delete` in the same file is
// never a table. The builder is recognised on a `drizzle()` instance however
// it is imported, a quoted method, a `transaction` callback handle, and a
// handle the file cannot trace (a path-alias import) when its argument is a
// table built with Drizzle's schema helpers. A file that never imports
// drizzle-orm is not judged.
module no_unscoped_mutation {
  type Client = Named | Require | Bracket | Tx | Untraced | NoImport
  type Call =
    | DeleteBare | DeleteReturning | UpdateSet | UpdateSetReturning
    | DeleteWhere | UpdateWhere | WhereVar | Deferred | MapDelete

  pure def unscoped(k: Call): bool = match k {
    | DeleteBare => true
    | DeleteReturning => true
    | UpdateSet => true
    | UpdateSetReturning => true
    | DeleteWhere => false
    | UpdateWhere => false
    | WhereVar => false
    | Deferred => false
    | MapDelete => false
  }

  pure def reports(c: Client, k: Call): bool = c != NoImport and unscoped(k)

  var client: Client
  var call: Call
  var verdict: bool

  action step = {
    nondet c = Set(Named, Require, Bracket, Tx, Untraced, NoImport).oneOf()
    nondet k = Set(
      DeleteBare, DeleteReturning, UpdateSet, UpdateSetReturning,
      DeleteWhere, UpdateWhere, WhereVar, Deferred, MapDelete,
    ).oneOf()
    all { client' = c, call' = k, verdict' = reports(c, k) }
  }

  action init = step
}
