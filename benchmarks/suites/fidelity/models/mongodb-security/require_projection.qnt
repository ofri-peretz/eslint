// Model of eslint-plugin-mongodb-security/require-projection (CWE-200).
// A Mongoose read (`find`, `findOne`, `findById`) with no projection returns
// every field, sensitive ones included. A projection as the second argument
// (a string or an object) or a `.select()` — inclusive or exclusive — fixes
// it; `.lean()` does not, and neither does an explicit `null` projection.
// `countDocuments` returns no fields. The docs leave the native driver out of
// scope (a documented false negative), so it is not in this domain. Only a
// Mongoose model is judged; a generic repository and a file with no Mongo are
// not. `.lean()` is Mongoose's own method, so a chain that calls it is Mongo
// evidence even in a file that imports its model relatively.
module require_projection {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Bracket | Nest | NoImport | Repo
  type Query =
    | Find | FindOne | FindById | LeanOnly | NullProjection
    | ProjString | ProjObject | SelectChain | SelectExclude | FindByIdProj | CountDocuments

  pure def mongooseModel(r: Receiver, q: Query): bool = match r {
    | Repo => false
    | NoImport => q == LeanOnly
    | _ => true
  }

  pure def unprojected(q: Query): bool = match q {
    | Find => true
    | FindOne => true
    | FindById => true
    | LeanOnly => true
    | NullProjection => true
    | ProjString => false
    | ProjObject => false
    | SelectChain => false
    | SelectExclude => false
    | FindByIdProj => false
    | CountDocuments => false
  }

  pure def reports(r: Receiver, q: Query): bool = mongooseModel(r, q) and unprojected(q)

  var receiver: Receiver
  var query: Query
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Bracket, Nest, NoImport, Repo).oneOf()
    nondet q = Set(
      Find, FindOne, FindById, LeanOnly, NullProjection,
      ProjString, ProjObject, SelectChain, SelectExclude, FindByIdProj, CountDocuments,
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
