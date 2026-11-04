// Model of eslint-plugin-mongodb-security/no-unsafe-query (CWE-943).
// A request value (`req.body` / `req.query` / `req.params`) placed as a raw
// filter value of a MongoDB query lets the client send `{ "$ne": null }` and
// rewrite the filter. Every branch of `$or` is a filter of its own; a spread of
// the request object is the whole filter. A value pinned by `$eq`, coerced to a
// string (`String()`, a template, a concatenation) or to an ObjectId carries no
// operator. `additionalMethods` adds a custom query method. The rule documents
// no receiver requirement: any query call in a Mongo file is judged (a
// repository wrapping a collection is common), a file with no Mongo is not.
module no_unsafe_query {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Bracket | Nest | Native | NoImport | Repo
  // CustomDefault: `customFind` with the option unset; CustomOpted: listed in additionalMethods.
  type Call = Find | FindOne | UpdateOne | CustomDefault | CustomOpted
  type Filter =
    | BodyValue | QueryValue | ParamsValue | OrBranch | SpreadBody
    | EqWrapped | StringCast | TemplateCoerced | Concatenated | ObjectIdWrapped | Literal

  pure def mongoRecv(r: Receiver): bool = r != NoImport

  pure def unsafe(f: Filter): bool = match f {
    | BodyValue => true
    | QueryValue => true
    | ParamsValue => true
    | OrBranch => true
    | SpreadBody => true
    | EqWrapped => false
    | StringCast => false
    | TemplateCoerced => false
    | Concatenated => false
    | ObjectIdWrapped => false
    | Literal => false
  }

  pure def checked(c: Call): bool = c != CustomDefault

  pure def reports(r: Receiver, c: Call, f: Filter): bool =
    mongoRecv(r) and checked(c) and unsafe(f)

  var receiver: Receiver
  var call: Call
  var shape: Filter
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Bracket, Nest, Native, NoImport, Repo).oneOf()
    nondet c = Set(Find, FindOne, UpdateOne, CustomDefault, CustomOpted).oneOf()
    nondet f = Set(
      BodyValue, QueryValue, ParamsValue, OrBranch, SpreadBody,
      EqWrapped, StringCast, TemplateCoerced, Concatenated, ObjectIdWrapped, Literal,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      call' = c,
      shape' = f,
      testCtx' = tc,
      verdict' = (reports(r, c, f) and not(exempt(tc))),
    }
  }

  action init = step
}
