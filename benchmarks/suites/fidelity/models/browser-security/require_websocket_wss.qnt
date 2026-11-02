// Model of eslint-plugin-browser-security/require-websocket-wss (CWE-319).
// Contract: a WebSocket constructed with a ws:// URL is reported, unless the
// host is localhost / 127.0.0.1 and allowLocalhost. URL schemes are
// case-insensitive; `localhost.evil.com` is not localhost. Other constructors
// are out of scope.
module require_websocket_wss {
  type Url = WsRemote | WssRemote | WsLocalhost | WsLoopback | WsTemplate | WssTemplate | UpperWs | LocalhostLookalike
  type Callee = NewWS | NewWindowWS | OtherCtor
  type Ctx = Prod | TestDefault | TestFlipped

  pure def insecure(u: Url): bool = match u {
    | WssRemote => false
    | WssTemplate => false
    | _ => true
  }

  pure def isLocal(u: Url): bool = match u {
    | WsLocalhost => true
    | WsLoopback => true
    | _ => false
  }

  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(u: Url, k: Callee, allowLocal: bool, c: Ctx): bool =
    not(skipped(c)) and k != OtherCtor and insecure(u) and not(allowLocal and isLocal(u))

  var url: Url
  var callee: Callee
  var allowLocal: bool
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet u = Set(WsRemote, WssRemote, WsLocalhost, WsLoopback, WsTemplate, WssTemplate, UpperWs, LocalhostLookalike).oneOf()
    nondet k = Set(NewWS, NewWindowWS, OtherCtor).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { url' = u, callee' = k, allowLocal' = a, ctx' = c, verdict' = reports(u, k, a, c) }
  }

  action init = step
}
