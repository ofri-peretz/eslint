// Model of eslint-plugin-node-security/no-shell-injection (CWE-78).
// Contract (docs): a shell command (exec, execSync, or spawn with shell: true)
// whose string is assembled by concatenation or template interpolation is
// reported. A literal or a bare identifier is not assembled; execFile with an
// argv vector has no shell. requireModuleEvidence (default true): only callees
// that resolve to child_process (any import spelling) count; off, any callee
// named exec/execSync/spawn is a sink (including db.exec(sql)).
module no_shell_injection {
  type Binding = CjsDestructure | EsmNamedNode | NsBracket | CjsRenamed
               | DbMember | Unbound
  type Sink = Exec | ExecSync | SpawnShellTrue | ExecFileArgv
  type Arg = Concat | Template | Literal | BareIdent

  pure def isModule(b: Binding): bool = match b {
    | CjsDestructure => true
    | EsmNamedNode => true
    | NsBracket => true
    | CjsRenamed => true
    | DbMember => false
    | Unbound => false
  }

  pure def reports(b: Binding, s: Sink, a: Arg, requireEvidence: bool): bool =
    s != ExecFileArgv
    and (a == Concat or a == Template)
    and (isModule(b) or not(requireEvidence))

  var binding: Binding
  var sink: Sink
  var arg: Arg
  var requireEvidence: bool
  var verdict: bool

  action step = {
    nondet b = Set(CjsDestructure, EsmNamedNode, NsBracket, CjsRenamed, DbMember, Unbound).oneOf()
    nondet s = Set(Exec, ExecSync, SpawnShellTrue, ExecFileArgv).oneOf()
    nondet a = Set(Concat, Template, Literal, BareIdent).oneOf()
    nondet r = Set(true, false).oneOf()
    all { binding' = b, sink' = s, arg' = a, requireEvidence' = r, verdict' = reports(b, s, a, r) }
  }

  action init = step
}
