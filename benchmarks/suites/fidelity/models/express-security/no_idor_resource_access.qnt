// Model of eslint-plugin-express-security/no-idor-resource-access (CWE-639).
// A single-resource lookup (findById, findByPk, findOne, findUnique,
// findFirst, findByIdAndUpdate/Delete, deleteOne, updateOne, …) whose argument
// carries a key read off req.params/query/body — directly or nested in a
// filter / Prisma `where` — inside a request handler that never reads an
// authenticated principal (req.user, req.auth, req.session, res.locals.user)
// is reported. Collection queries (find), keys not from the request, and a key
// first copied to a variable (documented false negative) are not.
// `lookupMethods` sets the vocabulary (here ['findById', 'fetchById']).
module no_idor_resource_access {
  type Method = FindById | FindByPk | FindOne | FindUnique | FindFirst | FindByIdAndUpdate
              | FindByIdAndDelete | DeleteOne | UpdateOne | Find | FetchById
  type Key = ParamsId | ParamsBracket | QueryId | BodyId | NestedFilter | PrismaWhere | ConstKey | CopiedVar
  type Principal = NoPrincipal | ReqUser | ReqSession | ReqAuth | ResLocalsUser
  type Handler = Arrow | FunctionExpr | RouterGet | RouteChain | NamedHandler
  type Focus = Methods | Keys | Principals | Handlers

  pure def lookup(m: Method, custom: bool): bool =
    if (custom) m == FindById or m == FetchById
    else m != Find and m != FetchById
  pure def fromRequest(k: Key): bool = k != ConstKey and k != CopiedVar
  pure def reports(m: Method, k: Key, p: Principal, custom: bool): bool =
    lookup(m, custom) and fromRequest(k) and p == NoPrincipal

  var focus: Focus
  var method: Method
  var key: Key
  var principal: Principal
  var handler: Handler
  var custom: bool
  var verdict: bool

  action step = {
    nondet f = Set(Methods, Keys, Principals, Handlers).oneOf()
    nondet c = (if (f == Methods) Set(true, false) else Set(false)).oneOf()
    nondet m = (if (f == Methods and c) Set(FindById, FetchById)
                else if (f == Methods) Set(FindById, FindByPk, FindOne, FindUnique, FindFirst, FindByIdAndUpdate,
                                           FindByIdAndDelete, DeleteOne, UpdateOne, Find, FetchById)
                else if (f == Keys) Set(FindOne) else Set(FindById)).oneOf()
    nondet k = (if (f == Keys) Set(ParamsId, ParamsBracket, QueryId, BodyId, NestedFilter, PrismaWhere, ConstKey, CopiedVar)
                else Set(ParamsId)).oneOf()
    nondet p = (if (f == Principals) Set(NoPrincipal, ReqUser, ReqSession, ReqAuth, ResLocalsUser)
                else if (f == Handlers) Set(NoPrincipal, ReqUser) else Set(NoPrincipal)).oneOf()
    nondet h = (if (f == Handlers) Set(Arrow, FunctionExpr, RouterGet, RouteChain, NamedHandler)
                else Set(Arrow)).oneOf()
    all { focus' = f, method' = m, key' = k, principal' = p, handler' = h, custom' = c,
          verdict' = reports(m, k, p, c) }
  }

  action init = step
}
