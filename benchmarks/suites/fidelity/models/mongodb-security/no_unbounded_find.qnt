// Model of eslint-plugin-mongodb-security/no-unbounded-find (CWE-400).
// A `find()` with no limit can return every document. A `.limit(n)` anywhere
// in the chain bounds it, as does a `limit` in the options object — the
// driver's second argument, Mongoose's third. (A `{ limit }` in the wrong slot
// — Mongoose's projection, or a third argument the driver ignores — is
// unbounded, but telling a driver collection from a model by name is
// unreliable, so the rule accepts either slot; those inputs are left out of
// this domain.) `skip()` alone does
// not bound; `findOne()` returns one document. Only a plausible Mongo receiver
// is judged (a module-level model in any spelling, an `@InjectModel()` model,
// a driver collection); an array `find` with a predicate, a generic repository
// and a file with no Mongo are not.
module no_unbounded_find {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Bracket | Nest | Native | NoImport | Repo
  type Query =
    | FindFilter | FindEmpty | FindNoArgs | SkipOnly | ToArray
    | LimitChain | SortLimitChain | OptsLimit
    | Predicate | FindOne

  pure def isMongo(r: Receiver): bool = r != NoImport and r != Repo
  pure def unbounded(q: Query): bool = match q {
    | FindFilter => true
    | FindEmpty => true
    | FindNoArgs => true
    | SkipOnly => true
    | ToArray => true
    | LimitChain => false
    | SortLimitChain => false
    | OptsLimit => false
    | Predicate => false
    | FindOne => false
  }

  pure def reports(r: Receiver, q: Query): bool = isMongo(r) and unbounded(q)

  var receiver: Receiver
  var query: Query
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Bracket, Nest, Native, NoImport, Repo).oneOf()
    nondet q = Set(
      FindFilter, FindEmpty, FindNoArgs, SkipOnly, ToArray,
      LimitChain, SortLimitChain, OptsLimit,
      Predicate, FindOne,
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
