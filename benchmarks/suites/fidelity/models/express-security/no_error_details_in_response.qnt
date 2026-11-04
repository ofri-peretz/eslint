// Model of eslint-plugin-express-security/no-error-details-in-response (CWE-209).
// An error binding — a catch parameter, or the first parameter (err/error) of
// error middleware or an error-first callback — that reaches a response body
// (res.send/json/end, chained status(), static bracket member, a `response`
// parameter) raw, as err.stack, inside an object, spread, or embedded in a
// template is reported. err.message is allowed unless allowMessage is false.
// Passing it on (next(err)), a generic body, or a serialisation wrapper (a
// documented false negative) is not. With allowInDev, a send inside a branch
// guarded to development is exempt; a production branch is not.
module no_error_details_in_response {
  type Source = CatchErr | CatchE | ErrorMiddleware | CallbackErr | CallbackError | NoBinding
  type Payload = Raw | Stack | StackBracket | Message | ObjInErr | ObjMessage | Spread | Template
               | Generic | Wrapped
  type Sink = Send | Json | StatusJson | End | BracketSend | ResponseParam | NextCall
  type Guard = NoGuard | IfDev | IfProd
  type Focus = Base | Sinks | Strict | Dev

  pure def isError(s: Source): bool = s != NoBinding
  pure def exposes(p: Payload, allowMessage: bool): bool = match p {
    | Message => not(allowMessage)
    | ObjMessage => not(allowMessage)
    | Generic => false
    | Wrapped => false
    | _ => true
  }
  pure def reports(s: Source, p: Payload, k: Sink, g: Guard, allowMessage: bool, allowInDev: bool): bool =
    isError(s) and k != NextCall and exposes(p, allowMessage) and not(allowInDev and g == IfDev)

  var focus: Focus
  var source: Source
  var payload: Payload
  var sink: Sink
  var guard: Guard
  var allowMessage: bool
  var allowInDev: bool
  var verdict: bool

  action step = {
    nondet f = Set(Base, Sinks, Strict, Dev).oneOf()
    nondet s = (if (f == Base) Set(CatchErr, CatchE, ErrorMiddleware, CallbackErr, CallbackError, NoBinding)
                else Set(CatchErr)).oneOf()
    nondet p = (if (f == Base or f == Strict)
                  Set(Raw, Stack, StackBracket, Message, ObjInErr, ObjMessage, Spread, Template, Generic, Wrapped)
                else Set(Stack)).oneOf()
    nondet k = (if (f == Sinks) Set(Send, Json, StatusJson, End, BracketSend, ResponseParam, NextCall)
                else Set(StatusJson)).oneOf()
    nondet g = (if (f == Dev) Set(NoGuard, IfDev, IfProd) else Set(NoGuard)).oneOf()
    nondet am = (if (f == Strict) Set(false) else Set(true)).oneOf()
    nondet ad = (if (f == Dev) Set(true, false) else Set(false)).oneOf()
    all { focus' = f, source' = s, payload' = p, sink' = k, guard' = g, allowMessage' = am,
          allowInDev' = ad, verdict' = reports(s, p, k, g, am, ad) }
  }

  action init = step
}
