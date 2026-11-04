// Model of eslint-plugin-mcp-sdk-security/no-command-injection-in-tool (CWE-78).
// A tool argument (a registerTool / tool handler's parameter, destructured or
// whole, a same-file handler passed by name, or request.params.arguments of a
// low-level CallToolRequestSchema handler) that is, builds or derives the
// command a child_process / execa / zx call runs is reported. A command
// position is the first argument, a shell's `-c` script, any argv element
// under `shell: true`, and the first token of a zx `$` template. An argv
// element of execFile, a quoted zx interpolation, a RegExp's or a database's
// `.exec`, a lookup into an allowlist, a comparison and a z.enum argument are
// not, nor is an imported call's result or a callback parameter that shadows
// the argument. A same-file helper's return and each element of an array
// built from the argument still carry it. A file with no MCP server package is not judged. ResourceTemplate
// variables are not this rule's sources.
module no_command_injection_in_tool {
  type Part = Wiring | Sinks
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None
  type Reg = Register | WholeArgs | Legacy | Named | LowLevel | Enum
  type Sink =
    | ExecSync | ExecNamespace | RequireMember | Promisified | ExecCallback
    | Spawn | SpawnShellC | SpawnShellTrue | ExecFileArgv | Fork
    | Execa | ExecaCommand | ZxFirst | ZxQuoted | RegexExec | DbExec
  type Flow =
    | Direct | Template | Concat | Derived | HelperReturn | ArrayElem
    | Lookup | Compare | OpaqueCall | Shadowed | Literal

  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and r == Legacy) and not(g == McpHandler and r == LowLevel)

  // Is the argument's text in the value handed to the sink?
  pure def carries(f: Flow): bool = match f {
    | Direct => true
    | Template => true
    | Concat => true
    | Derived => true
    | HelperReturn => true
    | ArrayElem => true
    | Lookup => false
    | OpaqueCall => false
    | Shadowed => false
    | Compare => false
    | Literal => false
  }

  // Does the sink run that value as (part of) a command?
  pure def commandPos(s: Sink): bool = match s {
    | ExecSync => true
    | ExecNamespace => true
    | RequireMember => true
    | Promisified => true
    | ExecCallback => true
    | Spawn => true
    | SpawnShellC => true
    | SpawnShellTrue => true
    | ExecFileArgv => false
    | Fork => true
    | Execa => true
    | ExecaCommand => true
    | ZxFirst => true
    | ZxQuoted => false
    | RegexExec => false
    | DbExec => false
  }

  pure def reports(p: Part, g: Gate, r: Reg, s: Sink, f: Flow): bool =
    mcpGate(g) and r != Enum and carries(f) and commandPos(s)

  var part: Part
  var gate: Gate
  var reg: Reg
  var sink: Sink
  var flow: Flow
  var verdict: bool

  action step = {
    nondet p = Set(Wiring, Sinks).oneOf()
    nondet g = (if (p == Wiring) Set(Esm, Require, Namespace, V2, McpHandler, Lookalike, None) else Set(Esm)).oneOf()
    nondet r = (if (p == Wiring) Set(Register, WholeArgs, Legacy, Named, LowLevel, Enum).filter(r => validReg(g, r)) else Set(Register)).oneOf()
    nondet s = (if (p == Wiring) Set(ExecSync, Spawn) else Set(ExecSync, ExecNamespace, RequireMember, Promisified, ExecCallback, Spawn, SpawnShellC, SpawnShellTrue, ExecFileArgv, Fork, Execa, ExecaCommand, ZxFirst, ZxQuoted, RegexExec, DbExec)).oneOf()
    nondet f = (if (p == Wiring) Set(Direct, Literal) else Set(Direct, Template, Concat, Derived, HelperReturn, ArrayElem, Lookup, Compare, OpaqueCall, Shadowed, Literal)).oneOf()
    all {
      part' = p,
      gate' = g,
      reg' = r,
      sink' = s,
      flow' = f,
      verdict' = reports(p, g, r, s, f),
    }
  }

  action init = step
}
