// Model of the server set-ups `mcp-sdk-security/require-http-transport-hardening`
// must judge: an MCP HTTP transport (SDK v1 Streamable HTTP or SSE, or v2's
// Node transport) with its options, served from an Express app, bound to an
// interface, behind some kind of authentication. `shouldReport` is the
// documented contract, as the union of the rule's four findings:
//   - rebinding: a v1 transport whose own options lack DNS-rebinding
//     protection with allowedHosts (options it cannot read are abstained on),
//     served from an app that validates no Host header;
//   - app: a v2 transport served from a hand-built Express app with no Host
//     validation;
//   - allInterfaces: `createMcpExpressApp({ host: '0.0.0.0' })` with no
//     allowedHosts;
//   - missingAuth: the server binds every interface — `listen` with no host
//     on an Express app binds `::`, and so does the factory above — and
//     nothing authenticates the caller.
// A credential check before the transport is served (an SDK bearer
// middleware on the route, or an inline header check that returns) also
// makes rebinding moot: a browser does not send the credential on its own.
// A check of the request BODY is not a credential.
module mcp_sdk_security_require_http_transport_hardening {
  type Transport = V1Streamable | V1Sse | V2Node
  type Options = NoOptions | Hardened | RebindingNoHosts | Unreadable
  type App = RawExpress | RawExpressValidated | McpAppDefault | McpAppAllInterfaces | McpAppAllowedHosts
  type Bind = NoListen | ListenNoHost | ListenLoopback | ListenAllInterfaces
  type Auth = NoAuth | BearerMiddleware | InlineHeaderGate | InlineBodyCheck

  var transport: Transport
  var options: Options
  var app: App
  var bind: Bind
  var auth: Auth
  var expected: bool

  pure def isV1(t: Transport): bool = match t { | V2Node => false | _ => true }

  pure def credential(a: Auth): bool =
    match a { | BearerMiddleware => true | InlineHeaderGate => true | _ => false }

  pure def validatesHost(a: App): bool =
    match a {
      | RawExpressValidated => true
      | McpAppDefault => true
      | McpAppAllowedHosts => true
      | _ => false
    }

  pure def transportOpen(o: Options): bool =
    match o { | NoOptions => true | RebindingNoHosts => true | _ => false }

  pure def bindsAll(a: App, b: Bind): bool =
    match b {
      | ListenAllInterfaces => true
      | ListenNoHost => true
      | _ => match a { | McpAppAllInterfaces => true | _ => false }
    }

  pure def shouldReport(t: Transport, o: Options, a: App, b: Bind, au: Auth): bool = {
    val gated = credential(au)
    val rebinding = isV1(t) and transportOpen(o) and not(validatesHost(a)) and not(gated)
    val appFinding = not(isV1(t)) and a == RawExpress and not(gated)
    val allInterfaces = a == McpAppAllInterfaces and not(gated)
    val missingAuth = bindsAll(a, b) and not(credential(au))
    rebinding or appFinding or allInterfaces or missingAuth
  }

  action init = all {
    nondet t = Set(V1Streamable, V1Sse, V2Node).oneOf()
    nondet o = Set(NoOptions, Hardened, RebindingNoHosts, Unreadable).oneOf()
    nondet a = Set(RawExpress, RawExpressValidated, McpAppDefault, McpAppAllInterfaces, McpAppAllowedHosts).oneOf()
    nondet b = Set(NoListen, ListenNoHost, ListenLoopback, ListenAllInterfaces).oneOf()
    nondet au = Set(NoAuth, BearerMiddleware, InlineHeaderGate, InlineBodyCheck).oneOf()
    all {
      transport' = t, options' = o, app' = a, bind' = b, auth' = au,
      expected' = shouldReport(t, o, a, b, au),
    }
  }

  action step = all {
    transport' = transport, options' = options, app' = app, bind' = bind,
    auth' = auth, expected' = expected,
  }
}
