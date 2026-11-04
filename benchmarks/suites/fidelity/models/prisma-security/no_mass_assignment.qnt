// Model of eslint-plugin-prisma-security/no-mass-assignment (CWE-915).
// A Prisma write whose payload position (`data`, and an upsert's `create` /
// `update`) receives the inbound request object wholesale lets the caller set
// every column on the model: `req.body`, `req.query`, a spread of it (a named
// field beside the spread does not help), a local alias, the `...rest` of a
// destructured body, or `await req.json()`. Silent: a payload that names its
// fields, a validated object (`Schema.parse(req.body)`), an object that only
// has a `body` key (`form.body`), and a literal. The write is recognised
// through the client however it is imported, a quoted method
// (`prisma.user['create']`) or model (`prisma['user']`), a
// `$transaction` callback handle, and a client the file cannot trace (a
// path-alias import) when the call reads a model off it in a file that
// imports Prisma. A file that never imports Prisma is not judged.
module no_mass_assignment {
  type Client = Named | Renamed | Require | Default | Bracket | ModelBracket | Tx | Untraced | NoImport
  type Method = Create | Update | UpsertCreate | UpsertUpdate | CreateMany | UpdateMany
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

  pure def reports(c: Client, m: Method, p: Payload): bool = c != NoImport and wholesale(p)

  var client: Client
  var method: Method
  var payload: Payload
  var verdict: bool

  action step = {
    nondet c = Set(Named, Renamed, Require, Default, Bracket, ModelBracket, Tx, Untraced, NoImport).oneOf()
    nondet m = Set(Create, Update, UpsertCreate, UpsertUpdate, CreateMany, UpdateMany).oneOf()
    nondet p = Set(
      ReqBody, ReqQuery, SpreadBody, SpreadPlus, LocalAlias, RestOf, FetchJson,
      NamedFields, Validated, FormBody, Literal,
    ).oneOf()
    all { client' = c, method' = m, payload' = p, verdict' = reports(c, m, p) }
  }

  action init = step
}
