// Model of eslint-plugin-browser-security/no-insecure-websocket (CWE-319).
// A ws:// URL (any case of the scheme, literal or template with a fixed ws://
// prefix) reports wherever it is written EXCEPT as the URL argument of
// `new WebSocket(…)`: that position is owned by require-websocket-wss, which
// ships the autofix (the documented cleartext-transport partition), so this
// rule is silent there. wss:// and a protocol chosen at runtime from
// location.protocol never report.
module no_insecure_websocket {
  type Scheme = Ws | Wss | WsUpper | WsTpl | WssTpl | DynProto
  type Pos = NewWebSocket | VarInit | CallArg | ObjProp

  pure def reports(s: Scheme, p: Pos): bool = p != NewWebSocket and match s {
    | Ws => true
    | WsUpper => true
    | WsTpl => true
    | Wss => false
    | WssTpl => false
    | DynProto => false
  }

  var scheme: Scheme
  var pos: Pos
  var verdict: bool

  action step = {
    nondet s = Set(Ws, Wss, WsUpper, WsTpl, WssTpl, DynProto).oneOf()
    nondet p = Set(NewWebSocket, VarInit, CallArg, ObjProp).oneOf()
    all { scheme' = s, pos' = p, verdict' = reports(s, p) }
  }

  action init = step
}
