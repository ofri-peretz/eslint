// Model of eslint-plugin-node-security/detect-child-process (CWE-78/114/88).
// Contract (docs/rules/detect-child-process.md): a child_process sink is reported
// when an attacker-reachable value (taint roots req/request/ctx/event/process)
// reaches the command; process.argv counts only where a shell parses it. Literals are silent; process.env is configuration, not a
// request ("Not a finding"); an unresolved value is silent unless
// reportUnresolvedCommands. The module binding is resolved by scope, so every
// spelling of the import counts and a same-named local function does not.
module detect_child_process {
  type Binding = CjsDestructure | CjsNodeDestructure | CjsRenamed | EsmNamed
               | EsmNamespaceNode | CjsBracket | NotModule
  type Method = Exec | ExecSync | Spawn | ExecFile
  type Arg = Literal | ReqValue | ReqTemplate | Argv | Env | Unresolved

  pure def isModule(b: Binding): bool = b != NotModule

  // A shell parses the command only for exec/execSync.
  pure def usesShell(m: Method): bool = m == Exec or m == ExecSync

  // process.argv is a taint root only where a shell parses it: whoever supplies
  // the command line can already run any program they name ("Not a finding").
  pure def tainted(m: Method, a: Arg): bool = match a {
    | Literal => false
    | ReqValue => true
    | ReqTemplate => true
    | Argv => usesShell(m)
    | Env => false
    | Unresolved => false
  }

  // reportUnresolvedCommands covers every method: spawn(cmd) as well as exec(cmd).
  pure def reports(b: Binding, m: Method, a: Arg, unresolvedOpt: bool): bool =
    isModule(b) and (tainted(m, a) or (unresolvedOpt and a == Unresolved))

  var binding: Binding
  var method: Method
  var arg: Arg
  var unresolvedOpt: bool
  var verdict: bool

  action step = {
    nondet b = Set(CjsDestructure, CjsNodeDestructure, CjsRenamed, EsmNamed,
                   EsmNamespaceNode, CjsBracket, NotModule).oneOf()
    nondet m = Set(Exec, ExecSync, Spawn, ExecFile).oneOf()
    nondet a = Set(Literal, ReqValue, ReqTemplate, Argv, Env, Unresolved).oneOf()
    nondet u = Set(true, false).oneOf()
    all {
      binding' = b, method' = m, arg' = a, unresolvedOpt' = u,
      verdict' = reports(b, m, a, u),
    }
  }

  action init = step
}
