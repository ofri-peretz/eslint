// Model of eslint-plugin-mongodb-security/require-lean-queries (CWE-400).
// A Mongoose read (`find`, `findOne`, `findById`) without `.lean()` hydrates
// full documents (change tracking, getters, virtuals) only to serialize them.
// `.lean()` anywhere in the chain — before `.exec()` or after `.select()` —
// fixes it. An aggregation and `countDocuments` already return plain values,
// and the native driver has no hydration at all. Only a Mongoose model is
// judged: a module-level model in any spelling or an `@InjectModel()` model;
// a generic repository and a file with no Mongo are not.
module require_lean_queries {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Bracket | Nest | Native | NoImport | Repo
  type Query =
    | Find | FindOne | FindById | FindExec | FindWhereChain
    | FindLean | SelectThenLean | FindByIdLean | LeanThenExec
    | Aggregate | CountDocuments

  pure def mongooseModel(r: Receiver): bool = r != Native and r != NoImport and r != Repo

  pure def heavy(q: Query): bool = match q {
    | Find => true
    | FindOne => true
    | FindById => true
    | FindExec => true
    | FindWhereChain => true
    | FindLean => false
    | SelectThenLean => false
    | FindByIdLean => false
    | LeanThenExec => false
    | Aggregate => false
    | CountDocuments => false
  }

  pure def reports(r: Receiver, q: Query): bool = mongooseModel(r) and heavy(q)

  var receiver: Receiver
  var query: Query
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Bracket, Nest, Native, NoImport, Repo).oneOf()
    nondet q = Set(
      Find, FindOne, FindById, FindExec, FindWhereChain,
      FindLean, SelectThenLean, FindByIdLean, LeanThenExec,
      Aggregate, CountDocuments,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      query' = q,
      testCtx' = tc,
      verdict' = (reports(r, q) and not(exempt(tc))),
    }
  }

  action init = step
}
