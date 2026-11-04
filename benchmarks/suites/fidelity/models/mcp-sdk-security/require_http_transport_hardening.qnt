// Model of eslint-plugin-mcp-sdk-security/require-http-transport-hardening
// (CWE-346, CWE-306).
// missingRebindingProtection: an SDK v1 HTTP transport (StreamableHTTP, SSE —
// options third — and v2's server-legacy SSE) whose options, inline or in a
// const, do not set enableDnsRebindingProtection: true with a non-empty
// allowedHosts (none, protection off, an explicit false whatever the hosts,
// no hosts, an empty list, allowedOrigins alone). A runtime flag or a spread
// is not read. App-level validation in the file suppresses it:
// hostHeaderValidation / localhostHostValidation, a createMcpExpressApp with
// no options, a loopback host or any allowedHosts, or an inline credential
// check in front of every handleRequest.
// allInterfacesWithoutAllowedHosts: createMcpExpressApp({ host: '0.0.0.0' |
// '::' }) with no allowedHosts.
// appWithoutHostValidation: an SDK v2 transport served from a hand-built
// express() / new Hono() app with no validator (an app passed in as a
// parameter is not judged).
// missingAuth: a file that constructs an MCP HTTP transport and binds every
// interface (listen on '0.0.0.0' / '::' / { host: '0.0.0.0' }, listen(port)
// on an express app or a Node http server, or createMcpExpressApp on every
// interface with no allowedHosts) with no auth: no SDK auth export, no custom .use() middleware
// (express.json() is a factory call), no extra route middleware, no inline
// header check; an app handed to another module's function is not judged,
// a same-file one is read. A loopback bind and a host it cannot place are
// not binds. Test files and files with no MCP package are not judged.
module require_http_transport_hardening {
  type Part = Options | AppValidation | Auth | V2Apps | Files
  type Cls = Streamable | StreamableRequire | Sse | LegacySse | LocalClass | NoMcp
  type Opts =
    | NoOptions | SessionOnly | ExplicitFalse | ExplicitFalseWithHosts | OnNoHosts | OnHosts
    | OnEmptyHosts | OnConstHosts | OriginsOnly | ConstProtected | ConstUnprotected
    | RuntimeFlag | Spread | CastProtected | CastUnprotected
  type Validation =
    | NoValidation | HostHeaderValidation | LocalhostValidation | CreateAppDefault | CreateAppLoopback
    | CreateAppAllWithHosts | CreateAppAllWithHostsListen | CreateAppAllNoHosts | CreateAppIpv6NoHosts
    | InlineCredentialCheck
  type Bind =
    | ListenAllV4 | ListenAllV6 | ListenObjHost | ListenPortOnly | HttpServerPortOnly
    | ListenLoopback | ListenHostVar | NoListen
  type AuthKind =
    | NoAuth | BearerAuth | UseMiddleware | UseFactoryOnly | RouteMiddleware | InlineHeaderCheck
    | MountImported | MountSameFileUse | MountSameFileNoUse
  type AppKind = ExpressApp | HonoApp | ExpressParam
  type V2Validator = V2None | V2HostHeader | V2Localhost | V2InlineCheck
  type Ctx = Prod | TestName | SpecName | TestsDir | E2eDir

  pure def sdkV1(c: Cls): bool = c != LocalClass and c != NoMcp
  pure def unprotected(o: Opts): bool = match o {
    | NoOptions => true
    | SessionOnly => true
    | ExplicitFalse => true
    | ExplicitFalseWithHosts => true
    | OnNoHosts => true
    | OnEmptyHosts => true
    | OriginsOnly => true
    | ConstUnprotected => true
    | CastUnprotected => true
    | _ => false
  }
  pure def suppresses(v: Validation): bool = match v {
    | NoValidation => false
    | CreateAppAllNoHosts => false
    | CreateAppIpv6NoHosts => false
    | _ => true
  }
  pure def allNoHosts(v: Validation): bool = v == CreateAppAllNoHosts or v == CreateAppIpv6NoHosts
  // Judgment call: createMcpExpressApp's `host` binds nothing (the caller's
  // listen() does); the rule counts the all-interfaces call as a bind only
  // when it also lacks allowedHosts. With allowedHosts and no listen() in the
  // file it is not a bind; with `app.listen(port)` it is (implicitly).
  pure def appBindsAll(v: Validation): bool =
    v == CreateAppAllNoHosts or v == CreateAppIpv6NoHosts or v == CreateAppAllWithHostsListen
  pure def bindsAll(b: Bind): bool = match b {
    | ListenAllV4 => true
    | ListenAllV6 => true
    | ListenObjHost => true
    | ListenPortOnly => true
    | HttpServerPortOnly => true
    | _ => false
  }
  pure def noAuth(a: AuthKind): bool = a == NoAuth or a == UseFactoryOnly or a == MountSameFileNoUse
  pure def judgedApp(k: AppKind): bool = k != ExpressParam

  pure def reports(p: Part, c: Cls, o: Opts, v: Validation, b: Bind, a: AuthKind, k: AppKind, w: V2Validator, x: Ctx): bool =
    if (p == Options) sdkV1(c) and unprotected(o)
    else if (p == AppValidation)
      (unprotected(o) and not(suppresses(v))) or allNoHosts(v) or appBindsAll(v)
    else if (p == Auth) bindsAll(b) and noAuth(a)
    else if (p == V2Apps) judgedApp(k) and w == V2None
    else x == Prod and sdkV1(c)

  var part: Part
  var cls: Cls
  var opts: Opts
  var validation: Validation
  var bind: Bind
  var auth: AuthKind
  var appKind: AppKind
  var v2Validator: V2Validator
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet p = Set(Options, AppValidation, Auth, V2Apps, Files).oneOf()
    nondet c = (if (p == Options) Set(Streamable, StreamableRequire, Sse, LegacySse, LocalClass, NoMcp) else if (p == Files) Set(Streamable, NoMcp) else Set(Streamable)).oneOf()
    nondet o = (if (p == Options) Set(NoOptions, SessionOnly, ExplicitFalse, ExplicitFalseWithHosts, OnNoHosts, OnHosts, OnEmptyHosts, OnConstHosts, OriginsOnly, ConstProtected, ConstUnprotected, RuntimeFlag, Spread, CastProtected, CastUnprotected) else if (p == AppValidation) Set(SessionOnly, OnHosts) else if (p == Files) Set(SessionOnly) else Set(OnHosts)).oneOf()
    nondet v = (if (p == AppValidation) Set(NoValidation, HostHeaderValidation, LocalhostValidation, CreateAppDefault, CreateAppLoopback, CreateAppAllWithHosts, CreateAppAllWithHostsListen, CreateAppAllNoHosts, CreateAppIpv6NoHosts, InlineCredentialCheck) else Set(NoValidation)).oneOf()
    nondet b = (if (p == Auth) Set(ListenAllV4, ListenAllV6, ListenObjHost, ListenPortOnly, HttpServerPortOnly, ListenLoopback, ListenHostVar, NoListen) else Set(NoListen)).oneOf()
    nondet a = (if (p == Auth) Set(NoAuth, BearerAuth, UseMiddleware, UseFactoryOnly, RouteMiddleware, InlineHeaderCheck, MountImported, MountSameFileUse, MountSameFileNoUse) else Set(NoAuth)).oneOf()
    nondet k = (if (p == V2Apps) Set(ExpressApp, HonoApp, ExpressParam) else Set(ExpressApp)).oneOf()
    nondet w = (if (p == V2Apps) Set(V2None, V2HostHeader, V2Localhost, V2InlineCheck) else Set(V2None)).oneOf()
    nondet x = (if (p == Files) Set(Prod, TestName, SpecName, TestsDir, E2eDir) else Set(Prod)).oneOf()
    all {
      part' = p,
      cls' = c,
      opts' = o,
      validation' = v,
      bind' = b,
      auth' = a,
      appKind' = k,
      v2Validator' = w,
      ctx' = x,
      verdict' = reports(p, c, o, v, b, a, k, w, x),
    }
  }

  action init = step
}
