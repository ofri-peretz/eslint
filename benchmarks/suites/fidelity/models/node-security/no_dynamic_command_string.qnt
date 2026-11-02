// Model of eslint-plugin-node-security/no-dynamic-command-string (CWE-77).
// Contract (docs): a non-static command string handed to an interpreter's
// command flag (sh/bash/zsh -c anywhere in argv, cmd /c, powershell -Command)
// or to a non-escaping runner (execaCommand, execaCommandSync, $.raw) is
// reported. "Assembled" includes template, concatenation and an identifier.
// Silent: a static command line, bash -e (errexit, a script path follows),
// zx/execa tagged templates (they escape), and invoking the program directly.
module no_dynamic_command_string {
  type Shape = SpawnBashC | ExecFileShC | SpawnSyncZshC | CmdSlashC | PowershellCommand
             | BashLoginC | BashErrexit | ExecaCommand | ExecaCommandSync | ZxRaw
             | ZxTagged | DirectProgram
  type Arg = Template | Concat | Ident | Literal
  type Imp = EsmNode | Cjs

  pure def unsafeShape(s: Shape): bool = match s {
    | SpawnBashC => true
    | ExecFileShC => true
    | SpawnSyncZshC => true
    | CmdSlashC => true
    | PowershellCommand => true
    | BashLoginC => true
    | BashErrexit => false
    | ExecaCommand => true
    | ExecaCommandSync => true
    | ZxRaw => true
    | ZxTagged => false
    | DirectProgram => false
  }

  pure def reports(s: Shape, a: Arg): bool = unsafeShape(s) and a != Literal

  var shape: Shape
  var arg: Arg
  var imp: Imp
  var verdict: bool

  action step = {
    nondet s = Set(SpawnBashC, ExecFileShC, SpawnSyncZshC, CmdSlashC, PowershellCommand,
                   BashLoginC, BashErrexit, ExecaCommand, ExecaCommandSync, ZxRaw,
                   ZxTagged, DirectProgram).oneOf()
    nondet a = Set(Template, Concat, Ident, Literal).oneOf()
    nondet i = Set(EsmNode, Cjs).oneOf()
    all { shape' = s, arg' = a, imp' = i, verdict' = reports(s, a) }
  }

  action init = step
}
