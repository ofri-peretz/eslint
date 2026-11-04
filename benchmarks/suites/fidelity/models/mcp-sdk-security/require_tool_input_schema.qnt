// Model of eslint-plugin-mcp-sdk-security/require-tool-input-schema (CWE-20).
// Without an input schema the SDK calls a tool's handler as handler(extra):
// no client argument reaches it. So a schema-less registerTool / legacy
// tool() (no params shape; a legacy annotations object is not a shape) is
// reported when its handler — inline, or a same-file function — destructures
// a key that is not a request-context key, reads such a property off its
// first parameter, or declares a second parameter. A zero-argument handler,
// one that reads only request-context keys (signal, authInfo, sessionId,
// _meta, requestInfo), a registration that declares a schema (raw shape,
// z.object, legacy shape), a config passed by reference or with a spread,
// and an imported handler are not. A file with no MCP server package is not
// judged.
module require_tool_input_schema {
  type Part = Handlers | Wiring
  type Reg = RegisterNoSchema | RegisterSchema | RegisterZObject | LegacyBare | LegacyDescription | LegacyAnnotations | LegacyShape | ConfigByRef | ConfigSpread
  type Handler =
    | NoParams | DestructuredArg | DestructuredContext | DestructuredAuthInfo | MemberArg | MemberContext
    | SecondParam | UnusedParam | NamedFnArg | ImportedHandler
  type Gate = Esm | Require | V2 | McpHandler | Lookalike | None

  pure def noSchema(r: Reg): bool = match r {
    | RegisterNoSchema => true
    | LegacyBare => true
    | LegacyDescription => true
    | LegacyAnnotations => true
    | _ => false
  }
  pure def expectsArgs(h: Handler): bool = match h {
    | DestructuredArg => true
    | MemberArg => true
    | SecondParam => true
    | NamedFnArg => true
    | _ => false
  }
  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and (r == LegacyBare or r == LegacyDescription or r == LegacyAnnotations or r == LegacyShape))

  pure def reports(g: Gate, r: Reg, h: Handler): bool = mcpGate(g) and noSchema(r) and expectsArgs(h)

  var part: Part
  var gate: Gate
  var reg: Reg
  var handler: Handler
  var verdict: bool

  action step = {
    nondet pt = Set(Handlers, Wiring).oneOf()
    nondet g = (if (pt == Handlers) Set(Esm) else Set(Esm, Require, V2, McpHandler, Lookalike, None)).oneOf()
    nondet r = (if (pt == Handlers) Set(RegisterNoSchema, RegisterSchema, RegisterZObject, LegacyBare, LegacyDescription, LegacyAnnotations, LegacyShape, ConfigByRef, ConfigSpread) else Set(RegisterNoSchema, LegacyBare).filter(x => validReg(g, x))).oneOf()
    nondet h = (if (pt == Handlers) Set(NoParams, DestructuredArg, DestructuredContext, DestructuredAuthInfo, MemberArg, MemberContext, SecondParam, UnusedParam, NamedFnArg, ImportedHandler) else Set(DestructuredArg, NoParams)).oneOf()
    all {
      part' = pt,
      gate' = g,
      reg' = r,
      handler' = h,
      verdict' = reports(g, r, h),
    }
  }

  action init = step
}
