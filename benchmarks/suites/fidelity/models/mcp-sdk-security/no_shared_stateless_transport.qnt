// Model of eslint-plugin-mcp-sdk-security/no-shared-stateless-transport (CWE-488).
// A stateless Streamable HTTP transport (v1 StreamableHTTPServerTransport, v2
// NodeStreamableHTTPServerTransport / WebStandardStreamableHTTPServerTransport)
// — options that set sessionIdGenerator to undefined or omit it, or no
// options at all — is reported when it is built outside every function, and
// when one built per request is connected to an SDK McpServer / Server built
// outside that function. A stateful transport, options the rule cannot read
// (a variable, a spread), a server from a factory call, a server and
// transport built together in one function, a class field, a same-named
// local class, a non-SDK server and a file with no MCP package are not.
// A TypeScript cast on the options changes nothing.
module no_shared_stateless_transport {
  type Part = Placements | Servers
  type Placement = ModuleLevel | PerRequestSharedServer | PerRequestLocalServer | PerRequestFactory | MainClosure | ClassField
  type Mode = Undefined | Omitted | NoOptions | Cast | Stateful | OptionsVar | Spread
  type Transport = V1 | NodeV2 | WebV2 | LocalClass
  type ServerKind = HighLevel | LowLevel | RequireHighLevel | NotSdk

  pure def stateless(m: Mode): bool = match m {
    | Undefined => true
    | Omitted => true
    | NoOptions => true
    | Cast => true
    | _ => false
  }
  pure def shared(p: Placement): bool = p == ModuleLevel or p == PerRequestSharedServer
  pure def sdkServer(p: Placement, k: ServerKind): bool = p == ModuleLevel or k != NotSdk

  pure def reports(p: Placement, m: Mode, t: Transport, k: ServerKind): bool =
    t != LocalClass and stateless(m) and shared(p) and sdkServer(p, k)

  var part: Part
  var placement: Placement
  var mode: Mode
  var transport: Transport
  var serverKind: ServerKind
  var verdict: bool

  action step = {
    nondet pt = Set(Placements, Servers).oneOf()
    nondet p = (if (pt == Placements) Set(ModuleLevel, PerRequestSharedServer, PerRequestLocalServer, PerRequestFactory, MainClosure, ClassField) else Set(PerRequestSharedServer, PerRequestLocalServer)).oneOf()
    nondet m = (if (pt == Placements) Set(Undefined, Omitted, NoOptions, Cast, Stateful, OptionsVar, Spread) else Set(Undefined, Stateful)).oneOf()
    nondet t = (if (pt == Placements) Set(V1, NodeV2, WebV2, LocalClass) else Set(V1)).oneOf()
    nondet k = (if (pt == Placements) Set(HighLevel) else Set(HighLevel, LowLevel, RequireHighLevel, NotSdk)).oneOf()
    all {
      part' = pt,
      placement' = p,
      mode' = m,
      transport' = t,
      serverKind' = k,
      verdict' = reports(p, m, t, k),
    }
  }

  action init = step
}
