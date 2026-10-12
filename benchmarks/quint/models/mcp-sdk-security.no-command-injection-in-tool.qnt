// Model of the code shapes `mcp-sdk-security/no-command-injection-in-tool`
// must judge: one tool argument, transformed, bound, and handed to one
// process-API position. `shouldReport` is the rule's documented contract: the
// argument (or text derived from it) chooses what runs — the command of a
// child_process / execa call, or the script after `sh -c` — and was not
// replaced by a value the code chose (an allowlist entry, a shell-quoted
// word, a fixed alternative). An argv element after a fixed binary, and the
// look-alikes `RegExp#exec` / a database `exec`, run nothing.
module mcp_sdk_security_no_command_injection_in_tool {
  type Transform = NoTransform | Trim | Template | Concat | Allowlist | QuotedTemplate | Selected
  type Binding = Inline | ViaConst | ViaLet | ViaHelperReturn | ViaHelperSink | ViaObjectField | ViaElement
  type Sink = ExecNamed | ExecSyncNamespace | PromisifiedExec | RequireSpawn | ExecaCommand | ShellDashC | ExecFileArgv | RegExpExec | DatabaseExec

  var transform: Transform
  var binding: Binding
  var sink: Sink
  var expected: bool

  pure def runsCommand(k: Sink): bool =
    match k {
      | ExecFileArgv => false
      | RegExpExec => false
      | DatabaseExec => false
      | _ => true
    }

  // Does the value still hold text the argument wrote?
  pure def carriesText(t: Transform): bool =
    match t {
      | Allowlist => false
      | QuotedTemplate => false
      | Selected => false
      | _ => true
    }

  pure def shouldReport(t: Transform, k: Sink): bool = runsCommand(k) and carriesText(t)

  action init = all {
    nondet t = Set(NoTransform, Trim, Template, Concat, Allowlist, QuotedTemplate, Selected).oneOf()
    nondet b = Set(Inline, ViaConst, ViaLet, ViaHelperReturn, ViaHelperSink, ViaObjectField, ViaElement).oneOf()
    nondet k = Set(ExecNamed, ExecSyncNamespace, PromisifiedExec, RequireSpawn, ExecaCommand, ShellDashC, ExecFileArgv, RegExpExec, DatabaseExec).oneOf()
    all {
      transform' = t, binding' = b, sink' = k,
      expected' = shouldReport(t, k),
    }
  }

  action step = all {
    transform' = transform, binding' = binding, sink' = sink, expected' = expected,
  }
}
