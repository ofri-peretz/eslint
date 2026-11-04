// Model of eslint-plugin-mcp-sdk-security/no-credential-leak-in-tool
// (CWE-526, CWE-200, CWE-441).
// A tool result that holds process.env whole (stringified, spread, its
// entries, through a binding, node:process's `env` export or default
// `process`, or `env` destructured from the global `process`, with or without a default) or `process.env[name]`
// with a tool-chosen name is reported; one named variable, a property merely named `env`, the key list, a
// constant index and a shadowing local `process` are not. The caller's bearer
// token (`authInfo.token`, or `authInfo` stringified) returned in a result,
// or forwarded in an outbound request (fetch, axios, an SDK client
// transport's headers) is reported. authInfo is read from the request
// context: the second parameter when the tool declares a schema, the first
// when it does not, the second of a low-level CallToolRequestSchema handler.
// A tool argument that happens to be called `authInfo` is not the token.
// clientId / scopes, the server's own credential, an exchanged token and a
// log line are not reported. Test files are exempt. A file with no MCP server
// package is not judged.
module no_credential_leak_in_tool {
  type Part = Wiring | Shapes | Tests
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None
  type Reg = Register | Destructured | NoSchema | LegacyNoSchema | LowLevel | ArgNamedAuthInfo
  type Shape =
    | EnvStringify | EnvSpread | EnvEntries | EnvIndexArg | EnvViaBinding | NodeProcessEnv
    | NodeProcessDefault | RequireProcessEnv | EnvDestructured | EnvDestructuredDefault
    | EnvNamedKey
    | EnvNamed | EnvKeys | EnvIndexConst | ShadowedProcess
    | TokenResult | TokenTemplate | AuthInfoStringify | ClientIdResult | ScopesResult
    | TokenFetch | TokenAxios | TokenClientTransport | ServiceToken | ExchangedToken | TokenLogged
  type Ctx = Prod | TestName | SpecName | TestDir | Fixtures | E2e

  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and r == LegacyNoSchema) and not(g == McpHandler and r == LowLevel)

  pure def envLeak(s: Shape): bool = match s {
    | EnvStringify => true
    | EnvSpread => true
    | EnvEntries => true
    | EnvIndexArg => true
    | EnvViaBinding => true
    | NodeProcessEnv => true
    | NodeProcessDefault => true
    | RequireProcessEnv => true
    | EnvDestructured => true
    | EnvDestructuredDefault => true
    | _ => false
  }
  pure def tokenLeak(s: Shape): bool = match s {
    | TokenResult => true
    | TokenTemplate => true
    | AuthInfoStringify => true
    | TokenFetch => true
    | TokenAxios => true
    | TokenClientTransport => true
    | _ => false
  }
  // Where the handler reads authInfo from is the SDK's request context.
  pure def contextAuthInfo(r: Reg): bool = r != ArgNamedAuthInfo

  pure def reports(g: Gate, r: Reg, s: Shape, c: Ctx): bool =
    mcpGate(g) and c == Prod and (envLeak(s) or (tokenLeak(s) and contextAuthInfo(r)))

  var part: Part
  var gate: Gate
  var reg: Reg
  var shape: Shape
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet p = Set(Wiring, Shapes, Tests).oneOf()
    nondet g = (if (p == Wiring) Set(Esm, Require, Namespace, V2, McpHandler, Lookalike, None) else Set(Esm)).oneOf()
    nondet r = (if (p == Wiring) Set(Register, Destructured, NoSchema, LegacyNoSchema, LowLevel, ArgNamedAuthInfo).filter(r => validReg(g, r)) else Set(Register)).oneOf()
    nondet s = (if (p == Shapes) Set(EnvStringify, EnvSpread, EnvEntries, EnvIndexArg, EnvViaBinding, NodeProcessEnv, NodeProcessDefault, RequireProcessEnv, EnvDestructured, EnvDestructuredDefault, EnvNamedKey, EnvNamed, EnvKeys, EnvIndexConst, ShadowedProcess, TokenResult, TokenTemplate, AuthInfoStringify, ClientIdResult, ScopesResult, TokenFetch, TokenAxios, TokenClientTransport, ServiceToken, ExchangedToken, TokenLogged) else Set(EnvStringify, TokenResult, TokenFetch, ClientIdResult)).oneOf()
    nondet c = (if (p == Tests) Set(Prod, TestName, SpecName, TestDir, Fixtures, E2e) else Set(Prod)).oneOf()
    all {
      part' = p,
      gate' = g,
      reg' = r,
      shape' = s,
      ctx' = c,
      verdict' = reports(g, r, s, c),
    }
  }

  action init = step
}
