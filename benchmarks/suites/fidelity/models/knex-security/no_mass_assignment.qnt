// Model of eslint-plugin-knex-security/no-mass-assignment (CWE-915).
// A knex write handed the whole request lets the caller set every column
// of the row. The writes are `insert`, `update` and an upsert's `merge`, on a
// table builder (`db('users')`, `.from('users')`, `.into('users')`), in a
// transaction, under every import spelling and a quoted member. A handle
// that cannot be traced still writes when the chain names its table
// (`conn('users').insert(...)` on a handle imported through a path alias);
// a bare `cache.insert(...)` does not.
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
    | Insert | Update | Merge | Into
    | From | Trx | Bracket | NamedImport
    | RequireImport | RequireCall | UntracedTable | UntracedPlain
    | NoImport | InTest
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
    not(Set(UntracedPlain, NoImport, InTest).contains(r))

  pure def reports(r: Receiver, p: Payload): bool = writes(r) and wholeRequest(p)

  var receiver: Receiver
  var payload: Payload
  var verdict: bool

  action step = {
    nondet r = Set(
      Insert, Update, Merge, Into, From,
      Trx, Bracket, NamedImport, RequireImport, RequireCall,
      UntracedTable, UntracedPlain, NoImport, InTest,
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
