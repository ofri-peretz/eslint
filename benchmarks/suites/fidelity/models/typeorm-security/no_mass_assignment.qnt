// Model of eslint-plugin-typeorm-security/no-mass-assignment (CWE-915).
// A TypeORM write handed the whole request lets the caller set every
// column on the entity. The writes are a repository's (or the manager's, or
// a transaction manager's) `save`, `insert`, `update` (payload second),
// `create`, `merge`, `preload`, `upsert`; an Active Record entity's static
// writes; an injected NestJS `Repository<T>`; a quoted member; and the
// QueryBuilder's `insert().values()` / `update().set()`, which write the same
// columns.
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
    | RepoSave | RepoInsert | RepoUpdate | RepoCreate
    | RepoMerge | RepoPreload | RepoUpsert | ManagerSave
    | ManagerTxn | NestRepo | Bracket | QbInsert
    | QbUpdate | ActiveRecord | NoImport | Untraced
    | InTest
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
    not(Set(NoImport, Untraced, InTest).contains(r))

  pure def reports(r: Receiver, p: Payload): bool = writes(r) and wholeRequest(p)

  var receiver: Receiver
  var payload: Payload
  var verdict: bool

  action step = {
    nondet r = Set(
      RepoSave, RepoInsert, RepoUpdate, RepoCreate, RepoMerge,
      RepoPreload, RepoUpsert, ManagerSave, ManagerTxn, NestRepo,
      Bracket, QbInsert, QbUpdate, ActiveRecord, NoImport,
      Untraced, InTest,
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
