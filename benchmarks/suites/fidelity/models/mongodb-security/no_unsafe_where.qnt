// Model of eslint-plugin-mongodb-security/no-unsafe-where (CWE-943,
// CVE-2025-23061, CVE-2024-53900). `$where` runs JavaScript on the server:
// every use is reported, user input or not — as an object key (bare or quoted,
// top level or inside an `$or` branch) or as Mongoose's `$where()` method on a
// model or a query. `$expr`, `$eq`, an aggregation, and a key merely named
// `where` (an ORM's filter) are fine. A file with no Mongo is not judged.
module no_unsafe_where {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Nest | Native | NoImport
  type Use =
    | WhereTemplateReq | WhereFunction | WhereLiteral | WhereQuotedKey | WhereInOr
    | MethodOnModel | MethodOnQuery
    | ExprCompare | EqValue | AggregateAddFields | PlainWhereKey

  pure def isWhere(u: Use): bool = match u {
    | WhereTemplateReq => true
    | WhereFunction => true
    | WhereLiteral => true
    | WhereQuotedKey => true
    | WhereInOr => true
    | MethodOnModel => true
    | MethodOnQuery => true
    | ExprCompare => false
    | EqValue => false
    | AggregateAddFields => false
    | PlainWhereKey => false
  }

  pure def reports(r: Receiver, u: Use): bool = r != NoImport and isWhere(u)

  var receiver: Receiver
  var use: Use
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Nest, Native, NoImport).oneOf()
    nondet u = Set(
      WhereTemplateReq, WhereFunction, WhereLiteral, WhereQuotedKey, WhereInOr,
      MethodOnModel, MethodOnQuery,
      ExprCompare, EqValue, AggregateAddFields, PlainWhereKey,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      use' = u,
      testCtx' = tc,
      verdict' = (reports(r, u) and not(exempt(tc))),
    }
  }

  action init = step
}
