// Model of `supabase-security/no-dynamic-rpc-name`: the function name handed
// to `.rpc()` and the client it is called on. The contract (rule doc): a name
// the file pins to a closed set (literals, consts, ternaries, same-file tables
// of literals, literal-union parameters) is fixed; anything a caller or a
// request can choose — or that this file cannot see — reports.
module supabase_security_no_dynamic_rpc_name {
  type Name = Literal | ConstLiteral | Ternary | TableKnownKey | TableDynamicKey | TemplateFixed | TemplateOfReq | ReqField | StringParam | UnionParam | LetReassigned | ImportedName
  type Client = ConstClient | ParamClient | AliasedImport

  var name: Name
  var client: Client
  var expected: bool

  pure def computed(n: Name): bool =
    Set(TemplateOfReq, ReqField, StringParam, LetReassigned, ImportedName).contains(n)

  pure def shouldReport(n: Name, c: Client): bool = computed(n)

  action init = all {
    nondet name0 = Set(Literal, ConstLiteral, Ternary, TableKnownKey, TableDynamicKey, TemplateFixed, TemplateOfReq, ReqField, StringParam, UnionParam, LetReassigned, ImportedName).oneOf()
    nondet client0 = Set(ConstClient, ParamClient, AliasedImport).oneOf()
    all {
      name' = name0,
      client' = client0,
      expected' = shouldReport(name0, client0),
    }
  }

  action step = all {
    name' = name,
    client' = client,
    expected' = expected,
  }
}
