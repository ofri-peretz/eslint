// Model of eslint-plugin-grpc-security/no-error-detail-leak (CWE-209).
// A status sent through what a gRPC handler was given (its callback,
// call.emit('error'), call.destroy) whose details carry a caught error's text.
// A caught error is a catch parameter or a .catch callback's parameter; a
// `new Error` or a loop variable is not. The text is the stack, the message,
// String(e), a template or a concatenation over it, or the error itself as
// details; its `code` or a literal is not. Another function, a 'data' emit or
// an object registered with something other than addService is not a sink.
// The status may be inline or a const object.
module no_error_detail_leak {
  type Source = CatchParam | PromiseCatch | NewError | LoopParam
  type Shape =
    | Stack | Message | StringWrap | Template | Concat | Itself | Code | Literal
  type Sink = Callback | Emit | Destroy | OtherFn | EmitData | NotHandler
  type Via = Inline | ConstObj

  pure def caught(s: Source): bool = s == CatchParam or s == PromiseCatch
  pure def carries(sh: Shape): bool = sh != Code and sh != Literal
  pure def sinks(k: Sink): bool = k == Callback or k == Emit or k == Destroy

  pure def reports(s: Source, sh: Shape, k: Sink): bool =
    caught(s) and carries(sh) and sinks(k)

  var source: Source
  var shape: Shape
  var sink: Sink
  var via: Via
  var verdict: bool

  action step = {
    nondet s = Set(CatchParam, PromiseCatch, NewError, LoopParam).oneOf()
    nondet sh = Set(
      Stack, Message, StringWrap, Template, Concat, Itself, Code, Literal,
    ).oneOf()
    nondet k = Set(Callback, Emit, Destroy, OtherFn, EmitData, NotHandler).oneOf()
    nondet v = Set(Inline, ConstObj).oneOf()
    all {
      source' = s, shape' = sh, sink' = k, via' = v,
      verdict' = reports(s, sh, k),
    }
  }

  action init = step
}
