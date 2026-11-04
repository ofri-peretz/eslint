// Model of eslint-plugin-mongodb-security/no-operator-injection (CWE-943).
// A request value read off a handler parameter (`(req, res)`, Fastify's
// `(request, reply)`, Koa's `ctx.request`) used as the operand of a query
// operator (`$ne`, `$gt`, `$nin`, ...) can itself be an operator object.
// `JSON.parse` turns it back into an object. A value that can only be a
// primitive (`Number()`, `parseInt()`, unary `+`, `String()`), `$eq`, a literal,
// or a local whose name merely contains `req.body` is not reported. The finding
// is the operator object itself, wherever it is built; a file with no Mongo is
// not judged. Raw (operator-less) values are no-unsafe-query's finding and are
// left out of this domain, as is `$in: req.body.tags`: an `$in` operand is
// matched as literal values, and the rule deliberately does not list `$in`.
module no_operator_injection {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Handler = Express | Fastify | Koa
  type Placement = InModelFind | InNativeFindOne | Standalone | NoImport
  type Operand =
    | NeBody | GtQueryOr | NinArray | GtJsonParse | LteParams
    | EqBody | GtNumber | GteParseInt | LtUnary | NeStringCast | NeLiteral | NotRequest

  pure def unsafe(o: Operand): bool = match o {
    | NeBody => true
    | GtQueryOr => true
    | NinArray => true
    | GtJsonParse => true
    | LteParams => true
    | EqBody => false
    | GtNumber => false
    | GteParseInt => false
    | LtUnary => false
    | NeStringCast => false
    | NeLiteral => false
    | NotRequest => false
  }

  pure def reports(p: Placement, o: Operand): bool = p != NoImport and unsafe(o)

  var handler: Handler
  var placement: Placement
  var operand: Operand
  var verdict: bool

  action step = {
    nondet h = Set(Express, Fastify, Koa).oneOf()
    nondet p = Set(InModelFind, InNativeFindOne, Standalone, NoImport).oneOf()
    nondet o = Set(
      NeBody, GtQueryOr, NinArray, GtJsonParse, LteParams,
      EqBody, GtNumber, GteParseInt, LtUnary, NeStringCast, NeLiteral, NotRequest,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      handler' = h,
      placement' = p,
      operand' = o,
      testCtx' = tc,
      verdict' = (reports(p, o) and not(exempt(tc))),
    }
  }

  action init = step
}
