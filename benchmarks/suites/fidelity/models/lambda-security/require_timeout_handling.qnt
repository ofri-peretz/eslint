// Model of eslint-plugin-lambda-security/require-timeout-handling (CWE-400).
// A Lambda handler that takes the context object and makes an external call
// (fetch, axios, an AWS SDK `send`, a database query) without any timeout
// handling is reported. Timeout handling: reading
// `context.getRemainingTimeInMillis()` (however the method is spelled), an
// AbortController, `AbortSignal.timeout(ms)` (the built-in timed abort
// signal), or racing the call (`Promise.race`). Purely local work needs none.
// Parameters are recognised by name: `contextParamNames` (default context,
// ctx, lambdaContext) and `eventParamNames` (default event, evt, e, request,
// req) each replace their default; a handler without a recognised context
// parameter is not checked (documented). Only in Lambda files.
// `allowInTests` (default true) exempts test files.
module require_timeout_handling {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Call = Fetch | AxiosGet | SdkSend | DbQuery | Compute | MapGet
  type Guard = NoGuard | RemainingCheck | BracketRemaining | AbortCtl | AbortSignalTimeout | PromiseRace
  type Param = EventContext | EventCtx | EventOnly | CustomCtxOpt | CustomCtxNoOpt | PayloadOpt
             | PayloadNoOpt
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
  type Focus = Calls | Guards | Params | Gates

  pure def external(c: Call): bool = c != Compute and c != MapGet
  pure def recognised(p: Param): bool = not(Set(EventOnly, CustomCtxNoOpt, PayloadNoOpt).contains(p))
  pure def reports(c: Call, g: Guard, p: Param): bool =
    external(c) and g == NoGuard and recognised(p)

  var focus: Focus
  var call: Call
  var guard: Guard
  var param: Param
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Calls, Guards, Params, Gates).oneOf()
    nondet c = (if (fo == Calls) Set(Fetch, AxiosGet, SdkSend, DbQuery, Compute, MapGet)
                else Set(Fetch)).oneOf()
    nondet g = (if (fo == Guards)
                  Set(NoGuard, RemainingCheck, BracketRemaining, AbortCtl, AbortSignalTimeout, PromiseRace)
                else Set(NoGuard)).oneOf()
    nondet p = (if (fo == Params)
                  Set(EventContext, EventCtx, EventOnly, CustomCtxOpt, CustomCtxNoOpt, PayloadOpt,
                      PayloadNoOpt)
                else Set(EventContext)).oneOf()
    nondet ga = (if (fo == Gates) Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy)
                 else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, call' = c, guard' = g, param' = p, gate' = ga, testCtx' = tc,
          verdict' = (reports(c, g, p) and not(exempt(tc))) }
  }

  action init = step
}
