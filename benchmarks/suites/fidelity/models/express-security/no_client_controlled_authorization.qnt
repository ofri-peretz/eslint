// Model of eslint-plugin-express-security/no-client-controlled-authorization (CWE-863).
// An authorization attribute read off a client-controlled container
// (req.body/query/params/headers/cookies) and used in a decision position
// (comparison, if/ternary test, switch, !, &&/||, .includes receiver or
// argument) is reported. `??`, a plain read, or passing the value on is not a
// decision. req.user / req.session are verified sources. Attribute vocabulary:
// role, isAdmin, user_id (snake_case), …; `extraProperties` adds names (tier).
module no_client_controlled_authorization {
  type Container = Body | Query | Params | Cookies | Headers | User | Session
  // Headers: Role = 'x-user-role', UserId = 'x-tenant-id', Page = 'content-type'.
  type Attr = Role | IsAdmin | UserId | Page | Tier
  type Pos = Eq | IfTruthy | Not | AndOr | Ternary | Switch | IncludesRecv | IncludesArg
           | Nullish | Assign | Json
  // Headers also read through Express's accessors req.get() / req.header().
  type Spell = Dot | Bracket | GetFn | HeaderFn
  // Evidence the file is Express code. A file with no Express import is not
  // analysed (plugin-wide gate).
  type Evidence = DefaultImport | Require | RouterNamed | TypeOnly | NoExpress

  pure def client(c: Container): bool = c != User and c != Session
  pure def vocab(a: Attr, extra: bool): bool =
    a == Role or a == IsAdmin or a == UserId or (a == Tier and extra)
  pure def decision(p: Pos): bool = p != Nullish and p != Assign and p != Json
  pure def reports(c: Container, a: Attr, p: Pos, extra: bool, ev: Evidence): bool =
    ev != NoExpress and client(c) and vocab(a, extra) and decision(p)

  var container: Container
  var attr: Attr
  var pos: Pos
  var spell: Spell
  var extra: bool
  var evidence: Evidence
  var verdict: bool

  action step = {
    nondet p = Set(Eq, IfTruthy, Not, AndOr, Ternary, Switch, IncludesRecv, IncludesArg,
                   Nullish, Assign, Json).oneOf()
    // Eq crosses every container/attribute/spelling/option; the other positions
    // are sampled on body vs user, role vs page.
    nondet c = (if (p == Eq) Set(Body, Query, Params, Cookies, Headers, User, Session)
                else Set(Body, User)).oneOf()
    nondet a = (if (p != Eq) Set(Role, Page)
                else if (c == Headers) Set(Role, UserId, Page)
                else Set(Role, IsAdmin, UserId, Page, Tier)).oneOf()
    nondet s = (if (p == Eq and c == Headers) Set(Bracket, GetFn, HeaderFn)
                else if (p == Eq) Set(Dot, Bracket) else Set(Bracket)).oneOf()
    nondet x = (if (p == Eq) Set(true, false) else Set(false)).oneOf()
    // Evidence is crossed on the plain body/role case only.
    nondet ev = (if (p == Eq and (c == Body or c == User) and a == Role and s == Dot and not(x))
                   Set(DefaultImport, Require, RouterNamed, TypeOnly, NoExpress)
                 else Set(DefaultImport)).oneOf()
    all { container' = c, attr' = a, pos' = p, spell' = s, extra' = x, evidence' = ev,
          verdict' = reports(c, a, p, x, ev) }
  }

  action init = step
}
