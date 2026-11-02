// Model of eslint-plugin-node-security/no-unsafe-dynamic-require (CWE-494/706).
// Contract (docs): a module loader (require, a createRequire()-made require from
// node:module/module in any spelling, dynamic import() unless allowDynamicImport)
// is reported when its specifier is attacker-reachable (taint roots req,
// request, ctx, event, process). A literal is fine; the recommended allowlist
// lookup (const table indexed by input) is the documented fix and is silent;
// an unresolved non-literal is silent unless reportUnresolvedSpecifiers. A local
// function that only shares the createRequire name is not the CJS loader.
module no_unsafe_dynamic_require {
  type Loader = RequireBare | CreateRequireNamed | ModuleDefaultCreateRequire
              | CjsCreateRequire | DynamicImport | LocalCreateRequire
  type Spec = Literal | ReqParam | ReqTemplate | ArgvConcat | EnvConcat
            | Unresolved | LookupTable

  pure def tainted(s: Spec): bool = match s {
    | Literal => false
    | ReqParam => true
    | ReqTemplate => true
    | ArgvConcat => true
    | EnvConcat => true
    | Unresolved => false
    | LookupTable => false
  }

  pure def reports(l: Loader, s: Spec, allowDyn: bool, unresolvedOpt: bool): bool =
    l != LocalCreateRequire
    and not(l == DynamicImport and allowDyn)
    and (tainted(s) or (unresolvedOpt and s == Unresolved))

  var loader: Loader
  var spec: Spec
  var allowDyn: bool
  var unresolvedOpt: bool
  var verdict: bool

  action step = {
    nondet l = Set(RequireBare, CreateRequireNamed, ModuleDefaultCreateRequire,
                   CjsCreateRequire, DynamicImport, LocalCreateRequire).oneOf()
    nondet s = Set(Literal, ReqParam, ReqTemplate, ArgvConcat, EnvConcat,
                   Unresolved, LookupTable).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet u = Set(true, false).oneOf()
    all {
      loader' = l, spec' = s, allowDyn' = a, unresolvedOpt' = u,
      verdict' = reports(l, s, a, u),
    }
  }

  action init = step
}
