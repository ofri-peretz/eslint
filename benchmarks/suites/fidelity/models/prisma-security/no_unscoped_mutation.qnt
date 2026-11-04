// Model of eslint-plugin-prisma-security/no-unscoped-mutation (CWE-284).
// Prisma's bulk mutations (`deleteMany`, `updateMany`,
// `updateManyAndReturn`) touch every row their `where` matches. Called with
// no argument, an empty options object, options carrying only `data`, or an
// empty `where: {}`, the statement matches the whole table: reported. A
// `where` with a condition is scoped; a filter the file cannot read (a
// variable, a helper's result) is treated as present and stays silent. The
// call is recognised through the client however it is imported, a quoted
// method or model, a `$transaction` callback handle, and a client the file
// cannot trace (a path-alias import) when the call reads a model off it in a
// file that imports Prisma. A file that never imports Prisma is not judged.
module no_unscoped_mutation {
  type Client =
    | Named | Renamed | Require | Default | Bracket | ModelBracket | Tx | Untraced | NoImport
  type Method = DeleteMany | UpdateMany | UpdateManyAndReturn
  type Args = NoArgs | EmptyObj | DataOnly | WhereEmpty | Where | WhereVar | Built

  pure def unscoped(a: Args): bool = match a {
    | NoArgs => true
    | EmptyObj => true
    | DataOnly => true
    | WhereEmpty => true
    | Where => false
    | WhereVar => false
    | Built => false
  }

  // `deleteMany` takes no `data`.
  pure def applies(m: Method, a: Args): bool = m != DeleteMany or a != DataOnly

  pure def reports(c: Client, m: Method, a: Args): bool = c != NoImport and unscoped(a)

  var client: Client
  var method: Method
  var args: Args
  var verdict: bool

  action step = {
    nondet c = Set(
      Named, Renamed, Require, Default, Bracket, ModelBracket, Tx, Untraced, NoImport,
    ).oneOf()
    nondet m = Set(DeleteMany, UpdateMany, UpdateManyAndReturn).oneOf()
    nondet a = Set(NoArgs, EmptyObj, DataOnly, WhereEmpty, Where, WhereVar, Built)
      .filter(x => applies(m, x)).oneOf()
    all { client' = c, method' = m, args' = a, verdict' = reports(c, m, a) }
  }

  action init = step
}
