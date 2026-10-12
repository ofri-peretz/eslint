// Model of the code shapes `mcp-sdk-security/no-ssrf-in-tool` must judge: a
// tool argument (or a server constant) placed into a URL, bound, optionally
// checked, and sent by one HTTP client. `shouldReport` is the documented
// contract: the argument decides the ORIGIN (the whole URL, the host, or text
// appended to an origin with no delimiter after it) and reaches a real
// request with no host allowlist check that exits before it. Filling a path
// or query segment after a fixed origin is safe. A scheme-only prefix, a URL
// syntax check and a protocol comparison are not host checks.
module mcp_sdk_security_no_ssrf_in_tool {
  type Source = ToolArg | ServerConst
  type Shape = Whole | HostInterp | PathAfterOrigin | QueryAfterOrigin | NewUrlWhole | NewUrlRelative | ConcatOpenOrigin
  type Guard = NoGuard | HostnameAllowlist | SomeCallback | SchemeOnly | IsValidUrlHelper | ProtocolCheck
  type Sink = Fetch | AxiosGet | AxiosConfig | GotDefault | UndiciRequest | HttpsGet
  type Binding = Inline | ViaLet | ViaHelperSink | ViaHelperReturn

  var source: Source
  var shape: Shape
  var guard: Guard
  var sink: Sink
  var binding: Binding
  var expected: bool

  pure def picksOrigin(s: Shape): bool =
    match s {
      | PathAfterOrigin => false
      | QueryAfterOrigin => false
      | NewUrlRelative => false
      | _ => true
    }

  pure def checksHost(g: Guard): bool =
    match g { | HostnameAllowlist => true | SomeCallback => true | _ => false }

  pure def shouldReport(src: Source, s: Shape, g: Guard): bool =
    match src {
      | ServerConst => false
      | ToolArg => picksOrigin(s) and not(checksHost(g))
    }

  action init = all {
    nondet src = Set(ToolArg, ServerConst).oneOf()
    nondet s = Set(Whole, HostInterp, PathAfterOrigin, QueryAfterOrigin, NewUrlWhole, NewUrlRelative, ConcatOpenOrigin).oneOf()
    nondet g = Set(NoGuard, HostnameAllowlist, SomeCallback, SchemeOnly, IsValidUrlHelper, ProtocolCheck).oneOf()
    nondet k = Set(Fetch, AxiosGet, AxiosConfig, GotDefault, UndiciRequest, HttpsGet).oneOf()
    nondet b = Set(Inline, ViaLet, ViaHelperSink, ViaHelperReturn).oneOf()
    all {
      source' = src, shape' = s, guard' = g, sink' = k, binding' = b,
      expected' = shouldReport(src, s, g),
    }
  }

  action step = all {
    source' = source, shape' = shape, guard' = guard, sink' = sink,
    binding' = binding, expected' = expected,
  }
}
