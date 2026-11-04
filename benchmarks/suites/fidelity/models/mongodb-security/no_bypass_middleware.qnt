// Model of eslint-plugin-mongodb-security/no-bypass-middleware (CWE-284).
// `updateOne`, `updateMany`, `findOneAndUpdate` and `findByIdAndUpdate` write
// without running `save` middleware (password hashing, auditing); `save()`,
// `create()` and reads do not bypass it. Only a receiver that is plausibly a
// Mongoose model is judged: a module-level model in any spelling (import,
// require, named, bracket), an `@InjectModel()` `this.userModel`. A generic
// `this.birdRepository`, a PascalCase property reached through `this`
// (`this.UserRepository`) and a file with no Mongo are not. The native driver
// has no middleware to bypass and is left out of the domain.
module no_bypass_middleware {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Bracket | Nest | NoImport | Repo | ThisPascal
  type Method = UpdateOne | UpdateMany | FindOneAndUpdate | FindByIdAndUpdate | Save | Create | FindById

  pure def bypasses(m: Method): bool = match m {
    | UpdateOne => true
    | UpdateMany => true
    | FindOneAndUpdate => true
    | FindByIdAndUpdate => true
    | Save => false
    | Create => false
    | FindById => false
  }

  pure def modelRecv(r: Receiver): bool = r != NoImport and r != Repo and r != ThisPascal

  pure def reports(r: Receiver, m: Method): bool = modelRecv(r) and bypasses(m)

  var receiver: Receiver
  var method: Method
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Bracket, Nest, NoImport, Repo, ThisPascal).oneOf()
    nondet m = Set(UpdateOne, UpdateMany, FindOneAndUpdate, FindByIdAndUpdate, Save, Create, FindById).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      method' = m,
      testCtx' = tc,
      verdict' = (reports(r, m) and not(exempt(tc))),
    }
  }

  action init = step
}
