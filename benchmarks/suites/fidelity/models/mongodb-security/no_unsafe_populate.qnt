// Model of eslint-plugin-mongodb-security/no-unsafe-populate (CWE-943,
// CVE-2025-23061). A `populate()` whose path (or the `select` of its options
// object, or a nested `populate`) comes from the request lets the client pull
// in related documents and their fields: a request value directly, a member
// of it, interpolated in a template, or as an array element. Hardcoded paths —
// inline, through a const, as an array or an options object — are fine.
// Query and document `populate()` alike; a file with no Mongo is not judged.
module no_unsafe_populate {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | RequireModel | NamedModel | Nest | Document | NoImport
  type Path =
    | QueryValue | BodyMember | ObjectPathReq | ObjectSelectReq | TemplateReq | ArrayReq | NestedReq
    | Literal | ConstLiteral | ArrayLiteral | ObjectLiteral | NestedLiteral

  pure def userControlled(p: Path): bool = match p {
    | QueryValue => true
    | BodyMember => true
    | ObjectPathReq => true
    | ObjectSelectReq => true
    | TemplateReq => true
    | ArrayReq => true
    | NestedReq => true
    | Literal => false
    | ConstLiteral => false
    | ArrayLiteral => false
    | ObjectLiteral => false
    | NestedLiteral => false
  }

  pure def reports(r: Receiver, p: Path): bool = r != NoImport and userControlled(p)

  var receiver: Receiver
  var path: Path
  var verdict: bool

  action step = {
    nondet r = Set(Model, RequireModel, NamedModel, Nest, Document, NoImport).oneOf()
    nondet p = Set(
      QueryValue, BodyMember, ObjectPathReq, ObjectSelectReq, TemplateReq, ArrayReq, NestedReq,
      Literal, ConstLiteral, ArrayLiteral, ObjectLiteral, NestedLiteral,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      path' = p,
      testCtx' = tc,
      verdict' = (reports(r, p) and not(exempt(tc))),
    }
  }

  action init = step
}
