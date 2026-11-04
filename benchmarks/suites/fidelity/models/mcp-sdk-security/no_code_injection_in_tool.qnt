// Model of eslint-plugin-mcp-sdk-security/no-code-injection-in-tool (CWE-95).
// A tool argument (or request.params.arguments, or a ResourceTemplate
// variable) that is, builds or derives the code given to eval, Function
// (called or constructed: every argument is code), a string setTimeout /
// setInterval, node:vm (runInNewContext, runInThisContext, runInContext,
// compileFunction, new Script) or a vm2 VM / NodeVM `run` is reported.
// A setTimeout given a function, a `setTimeout` imported from
// node:timers/promises, JSON.parse, mathjs' evaluate, a literal and a z.enum
// argument are not. A static resource's URI is not client-chosen. A file with
// no MCP server package is not judged.
module no_code_injection_in_tool {
  type Part = Wiring | Sinks
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None
  type Reg = Register | WholeArgs | Legacy | Named | LowLevel | Enum | ResTemplate | ResStatic
  type Sink =
    | Eval | NewFunction | FunctionCall | SetTimeoutString | SetIntervalString
    | VmNewContext | VmNamedThisContext | VmScript | VmRequireCompile | Vm2Run | NodeVmRun
    | SetTimeoutFn | TimersPromises | JsonParse | MathjsEvaluate
  type Flow = Direct | Template | Concat | Derived | HelperReturn | OpaqueCall | Literal

  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and r == Legacy) and not(g == McpHandler and r == LowLevel)
  pure def source(r: Reg): bool = r != Enum and r != ResStatic

  pure def carries(f: Flow): bool = match f {
    | Direct => true
    | Template => true
    | Concat => true
    | Derived => true
    | HelperReturn => true
    | OpaqueCall => false
    | Literal => false
  }

  pure def evaluates(s: Sink): bool = match s {
    | Eval => true
    | NewFunction => true
    | FunctionCall => true
    | SetTimeoutString => true
    | SetIntervalString => true
    | VmNewContext => true
    | VmNamedThisContext => true
    | VmScript => true
    | VmRequireCompile => true
    | Vm2Run => true
    | NodeVmRun => true
    | SetTimeoutFn => false
    | TimersPromises => false
    | JsonParse => false
    | MathjsEvaluate => false
  }

  pure def reports(g: Gate, r: Reg, s: Sink, f: Flow): bool =
    mcpGate(g) and source(r) and carries(f) and evaluates(s)

  var part: Part
  var gate: Gate
  var reg: Reg
  var sink: Sink
  var flow: Flow
  var verdict: bool

  action step = {
    nondet p = Set(Wiring, Sinks).oneOf()
    nondet g = (if (p == Wiring) Set(Esm, Require, Namespace, V2, McpHandler, Lookalike, None) else Set(Esm)).oneOf()
    nondet r = (if (p == Wiring) Set(Register, WholeArgs, Legacy, Named, LowLevel, Enum, ResTemplate, ResStatic).filter(r => validReg(g, r)) else Set(Register)).oneOf()
    nondet s = (if (p == Wiring) Set(Eval, VmNewContext) else Set(Eval, NewFunction, FunctionCall, SetTimeoutString, SetIntervalString, VmNewContext, VmNamedThisContext, VmScript, VmRequireCompile, Vm2Run, NodeVmRun, SetTimeoutFn, TimersPromises, JsonParse, MathjsEvaluate)).oneOf()
    nondet f = (if (p == Wiring) Set(Direct, Literal) else Set(Direct, Template, Concat, Derived, HelperReturn, OpaqueCall, Literal)).oneOf()
    all {
      part' = p,
      gate' = g,
      reg' = r,
      sink' = s,
      flow' = f,
      verdict' = reports(g, r, s, f),
    }
  }

  action init = step
}
