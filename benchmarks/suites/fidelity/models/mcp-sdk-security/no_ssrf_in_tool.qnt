// Model of eslint-plugin-mcp-sdk-security/no-ssrf-in-tool (CWE-918).
// A tool argument (or request.params.arguments, or a ResourceTemplate
// variable) that decides the origin of an outbound request is reported unless
// a host allowlist check exits first. The origin is decided when the argument
// is the URL, the host, follows a fixed text that has not yet reached a `/`,
// `?` or `#` after the host (`'https://api.example.com' + sub`, `${BASE}${p}`),
// is the first argument of `new URL(arg, BASE)`, or follows an unreadable base
// with no `/` between. A fixed origin followed by a path or query is not.
// Clients: global fetch (unless shadowed), node-fetch, undici, axios (direct,
// verb, instance, config `url`), got, http(s).get. A cache's `get` is not a
// request. A protocol-only check is not a host check. A literal URL and a
// z.enum argument are not reported. A file with no MCP server package is not
// judged.
module no_ssrf_in_tool {
  type Part = Wiring | Sinks
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None
  type Reg = Register | WholeArgs | Legacy | Named | LowLevel | Enum | ResTemplate | ResStatic
  type Sink =
    | GlobalFetch | NodeFetch | UndiciRequest | AxiosGet | AxiosConfig | AxiosInstance
    | Got | HttpsGet | CacheGet | ShadowedFetch
  type Flow =
    | Direct | HostTemplate | OriginConcat | BaseNoSlash | NewUrlAbsolute | EnvBaseNoSlash
    | PathTemplate | EncodedPath | NewUrlPath | EnvBaseSlash
    | HostAllowlist | HostCompare | ProtocolCheck | SchemePrefixCheck | Literal

  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and r == Legacy) and not(g == McpHandler and r == LowLevel)
  pure def source(r: Reg): bool = r != Enum and r != ResStatic

  pure def picksOrigin(f: Flow): bool = match f {
    | Direct => true
    | HostTemplate => true
    | OriginConcat => true
    | BaseNoSlash => true
    | NewUrlAbsolute => true
    | EnvBaseNoSlash => true
    | PathTemplate => false
    | EncodedPath => false
    | NewUrlPath => false
    | EnvBaseSlash => false
    | HostAllowlist => false
    | HostCompare => false
    | ProtocolCheck => true
    | SchemePrefixCheck => true
    | Literal => false
  }

  pure def request(s: Sink): bool = s != CacheGet and s != ShadowedFetch

  pure def reports(g: Gate, r: Reg, s: Sink, f: Flow): bool =
    mcpGate(g) and source(r) and picksOrigin(f) and request(s)

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
    nondet s = (if (p == Wiring) Set(GlobalFetch, AxiosGet) else Set(GlobalFetch, NodeFetch, UndiciRequest, AxiosGet, AxiosConfig, AxiosInstance, Got, HttpsGet, CacheGet, ShadowedFetch)).oneOf()
    nondet f = (if (p == Wiring) Set(Direct, PathTemplate) else Set(Direct, HostTemplate, OriginConcat, BaseNoSlash, NewUrlAbsolute, EnvBaseNoSlash, PathTemplate, EncodedPath, NewUrlPath, EnvBaseSlash, HostAllowlist, HostCompare, ProtocolCheck, SchemePrefixCheck, Literal)).oneOf()
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
