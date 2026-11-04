// Model of eslint-plugin-lambda-security/no-exposed-error-details (CWE-209).
// A Lambda RESPONSE (statusCode/body object returned, built in a variable, or
// handed to the Lambda callback) whose body carries internal error detail is
// reported: the stack (`stack`, `stackTrace`, however spelled), the error's
// `config`/`env`/`cause`, the deployment path (__dirname, __filename), or the
// whole serialized error (JSON.stringify(error)). A generic message, the
// request id, or `error.message` (the docs say sanitize, not never) is fine,
// and so is logging any of it server-side. Only the ERROR's stack counts: the
// application's own `deployment.stack` or a serialized domain object is data. Only in Lambda files.
// `allowInTests` (default true) exempts test files.
module no_exposed_error_details {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Leak = Stack | StackTrace | StackBracket | Dirname | Filename | Config | ErrEnv | Cause
            | WholeError | Message | Generic | RequestId | OtherStack | DomainObject
  type Loc = BodyStringify | BodyDirect | ConsoleLog | ResponseVar | Callback
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Leaks | Locs | Gates

  pure def detail(l: Leak): bool =
    not(Set(Message, Generic, RequestId, OtherStack, DomainObject).contains(l))
  pure def responds(l: Loc): bool = l != ConsoleLog
  pure def reports(l: Leak, o: Loc, g: Gate): bool = detail(l) and responds(o) and g != NoEvidence

  var focus: Focus
  var leak: Leak
  var loc: Loc
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Leaks, Locs, Gates).oneOf()
    nondet l = (if (fo == Leaks)
                  Set(Stack, StackTrace, StackBracket, Dirname, Filename, Config, ErrEnv, Cause,
                      WholeError, Message, Generic, RequestId, OtherStack, DomainObject)
                else if (fo == Locs) Set(Stack, WholeError, Message)
                else Set(Stack, Generic)).oneOf()
    nondet o = (if (fo == Locs)
                  Set(BodyStringify, BodyDirect, ConsoleLog, ResponseVar, Callback)
                else Set(BodyStringify)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, leak' = l, loc' = o, gate' = g, testCtx' = tc,
          verdict' = (reports(l, o, g) and not(exempt(tc))) }
  }

  action init = step
}
