// Model of eslint-plugin-drizzle-security/no-mass-assignment (CWE-915).
// Drizzle takes the row directly: `insert(t).values(row)`,
// `update(t).set(row)`, and the upsert's update half
// `onConflictDoUpdate({ set: row })` / `onDuplicateKeyUpdate({ set: row })`.
// A row that is the inbound request object wholesale lets the caller set
// every column: `req.body`, `req.query`, a spread of it (a named field beside
// the spread does not help), a local alias, the `...rest` of a destructured
// body, or `await req.json()`. Silent: a row that names its fields, a
// validated object, an object that only has a `body` key (`form.body`), a
// literal, and a `Map#set` in the same file (never a write). The write is
// recognised on a `drizzle()` instance however it is imported, a quoted
// method, a `transaction` callback handle, and a handle the file cannot trace
// (a path-alias import) when the write directly follows the statement verb
// (`db.insert(t).values(...)`, `db.update(t).set(...)`). A file
// that never imports drizzle-orm is not judged.
module no_mass_assignment {
  type Client = Named | Require | Bracket | Tx | Untraced | NoImport
  type Write = InsertValues | UpdateSet | ConflictSet | DuplicateSet | MapSet
  type Payload =
    | ReqBody | ReqQuery | SpreadBody | SpreadPlus | LocalAlias | RestOf | FetchJson
    | NamedFields | Validated | FormBody | Literal

  pure def wholesale(p: Payload): bool = match p {
    | ReqBody => true
    | ReqQuery => true
    | SpreadBody => true
    | SpreadPlus => true
    | LocalAlias => true
    | RestOf => true
    | FetchJson => true
    | NamedFields => false
    | Validated => false
    | FormBody => false
    | Literal => false
  }

  // An untraceable handle is recognised by the write directly following the
  // statement verb (`insert(t).values`, `update(t).set`); the upsert half
  // follows `.values()`, not the verb, so it needs a traceable handle.
  pure def recognised(c: Client, w: Write): bool =
    if (c == Untraced) w == InsertValues or w == UpdateSet
    else c != NoImport and w != MapSet

  pure def reports(c: Client, w: Write, p: Payload): bool =
    recognised(c, w) and wholesale(p)

  var client: Client
  var write: Write
  var payload: Payload
  var verdict: bool

  action step = {
    nondet c = Set(Named, Require, Bracket, Tx, Untraced, NoImport).oneOf()
    nondet w = Set(InsertValues, UpdateSet, ConflictSet, DuplicateSet, MapSet).oneOf()
    nondet p = Set(
      ReqBody, ReqQuery, SpreadBody, SpreadPlus, LocalAlias, RestOf, FetchJson,
      NamedFields, Validated, FormBody, Literal,
    ).oneOf()
    all { client' = c, write' = w, payload' = p, verdict' = reports(c, w, p) }
  }

  action init = step
}
