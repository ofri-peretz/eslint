// Model of eslint-plugin-supabase-security/no-dynamic-rpc-name (CWE-470).
// `db.rpc(name, args)` runs the Postgres function called `name`, so a name
// the caller can choose lets the caller pick any exposed function
// (`delete_user`, `grant_admin`). The name is safe only when the file fixes
// it: a literal, a template whose holes are fixed or number/boolean literals,
// a `const` holding one, a ternary between fixed names, a lookup in a
// same-file table of literal names (`as const` or not, `RPC[kind]` or
// `RPC.single`), or a parameter typed as a union of string literals (directly
// or through a same-file alias). A request field, a template over request
// data, a `string` parameter, a reassigned `let`, a table with a computed or
// spread entry, an imported name and a ternary with one dynamic branch are
// not fixed. A spread argument is unreadable and abstains. The call is judged
// as `db.rpc(...)` and `db['rpc'](...)`; files with no `@supabase/*` import
// are not judged.
module no_dynamic_rpc_name {
  type Spelling = Named | Renamed | Require | Namespace | Ssr | NoImport
  type Call = Dot | Bracket
  type Name =
    | Literal | TemplatePlain | TemplateConstHole | TemplateNumberHole
    | ConstName | TernaryFixed | Lookup | LookupAsConst | LookupDot
    | UnionParam | UnionAlias | SpreadArg
    | ReqField | TemplateReq | StringParam | ReassignedLet | TableComputed
    | TableSpread | Imported | TernaryReq

  pure def dynamic(n: Name): bool = match n {
    | Literal => false
    | TemplatePlain => false
    | TemplateConstHole => false
    | TemplateNumberHole => false
    | ConstName => false
    | TernaryFixed => false
    | Lookup => false
    | LookupAsConst => false
    | LookupDot => false
    | UnionParam => false
    | UnionAlias => false
    | SpreadArg => false
    | ReqField => true
    | TemplateReq => true
    | StringParam => true
    | ReassignedLet => true
    | TableComputed => true
    | TableSpread => true
    | Imported => true
    | TernaryReq => true
  }

  pure def reports(sp: Spelling, n: Name): bool = sp != NoImport and dynamic(n)

  var spelling: Spelling
  var call: Call
  var name: Name
  var verdict: bool

  action step = {
    nondet sp = Set(Named, Renamed, Require, Namespace, Ssr, NoImport).oneOf()
    nondet c = Set(Dot, Bracket).oneOf()
    nondet n = Set(
      Literal, TemplatePlain, TemplateConstHole, TemplateNumberHole,
      ConstName, TernaryFixed, Lookup, LookupAsConst, LookupDot,
      UnionParam, UnionAlias, SpreadArg,
      ReqField, TemplateReq, StringParam, ReassignedLet, TableComputed,
      TableSpread, Imported, TernaryReq,
    ).oneOf()
    all { spelling' = sp, call' = c, name' = n, verdict' = reports(sp, n) }
  }

  action init = step
}
