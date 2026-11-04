// Model of eslint-plugin-sequelize-security/no-mass-assignment (CWE-915).
// A Sequelize write handed the whole request lets the caller set every
// column on the model. The writes are `create`, `build`, `bulkCreate`,
// `upsert`, static `update`, and an instance's `update` / `set`, on a model
// from `sequelize.define()`, a class extending `Model` (sequelize or
// sequelize-typescript), under any import spelling or a quoted member.
// `{ fields: [...] }`, Sequelize's own allowlist, makes the call safe. A
// `Map#set` in a Sequelize file is not a write.
// The request is the whole inbound payload where a handler receives it:
// `req.body` / `req.query` / `req.params`, a spread of it (a named field
// beside the spread does not help), a local alias, the `...rest` of a
// destructured body, `Object.assign(row, req.body)` before the write,
// `await request.json()`, `JSON.parse(event.body)` and a handler that
// destructures `({ body })`. Silent: named fields, fields destructured out
// first, a validated or helper-built object (unprovable, not guessed), an
// application object with a `body` key, `ctx.data`, a constant, a file with
// no driver import, an untraceable receiver, and test files.
module no_mass_assignment {
  type Receiver =
    | Define | ClassModel | StaticUpdate | InstanceUpdate
    | InstanceSet | Upsert | Build | BulkCreate
    | Bracket | RequireDefine | Typescript | Allowlist
    | NoImport | Untraced | MapSet | InTest
  type Payload =
    | ReqBody | ReqQuery | ReqParams | Spread
    | SpreadPlus | Alias | Rest | ObjectAssign
    | FetchJson | LambdaEvent | DestructuredBody | Named
    | Picked | Validated | Helper | FormBody
    | CtxData | Constant

  pure def wholeRequest(p: Payload): bool = match p {
    | ReqBody => true
    | ReqQuery => true
    | ReqParams => true
    | Spread => true
    | SpreadPlus => true
    | Alias => true
    | Rest => true
    | ObjectAssign => true
    | FetchJson => true
    | LambdaEvent => true
    | DestructuredBody => true
    | Named => false
    | Picked => false
    | Validated => false
    | Helper => false
    | FormBody => false
    | CtxData => false
    | Constant => false
  }

  pure def writes(r: Receiver): bool =
    not(Set(Allowlist, NoImport, Untraced, MapSet, InTest).contains(r))

  pure def reports(r: Receiver, p: Payload): bool = writes(r) and wholeRequest(p)

  var receiver: Receiver
  var payload: Payload
  var verdict: bool

  action step = {
    nondet r = Set(
      Define, ClassModel, StaticUpdate, InstanceUpdate, InstanceSet,
      Upsert, Build, BulkCreate, Bracket, RequireDefine,
      Typescript, Allowlist, NoImport, Untraced, MapSet,
      InTest,
    ).oneOf()
    nondet p = Set(
      ReqBody, ReqQuery, ReqParams, Spread, SpreadPlus,
      Alias, Rest, ObjectAssign, FetchJson, LambdaEvent,
      DestructuredBody, Named, Picked, Validated, Helper,
      FormBody, CtxData, Constant,
    ).oneOf()
    all { receiver' = r, payload' = p, verdict' = reports(r, p) }
  }

  action init = step
}
