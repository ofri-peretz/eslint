// Model of eslint-plugin-lambda-security/no-error-swallowing (CWE-390).
// A catch block in Lambda code that takes no action on the error is reported:
// an empty block, `return;` / `return null`, or a return that reports success
// on failure (`{ statusCode: 200 }`, `true`, `callback(null, ok)`). Acting on
// it is fine: logging (console.* or a Powertools Logger), rethrowing or
// wrapping it, handing it to the Lambda `callback(error)`, or failing closed
// with an error response. An EMPTY block whose comment explains that the
// swallowing is intentional is allowed while `allowWithComment` (default true)
// is on; a comment that explains nothing (`// TODO`) never is. Only in Lambda
// files. `allowInTests` (default true) exempts test files.
module no_error_swallowing {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Body = Empty | EmptyIntentional | EmptyTodo | ConsoleError | PowertoolsError | Rethrow
            | WrapThrow | ReturnSuccess | ReturnServerError | ReturnNull | BareReturn | ReturnTrue
            | CallbackError | CallbackSuccess | LogInCallback
  type Binding = Named | Short | Unbound
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Bodies | Bindings | Gates

  pure def swallows(b: Body): bool =
    Set(Empty, EmptyTodo, ReturnSuccess, ReturnNull, BareReturn, ReturnTrue, CallbackSuccess).contains(b)
  pure def reports(b: Body, commentOff: bool, g: Gate): bool =
    g != NoEvidence and (swallows(b) or (b == EmptyIntentional and commentOff))

  var focus: Focus
  var body: Body
  var binding: Binding
  var commentOff: bool
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Bodies, Bindings, Gates).oneOf()
    nondet b = (if (fo == Bodies)
                  Set(Empty, EmptyIntentional, EmptyTodo, ConsoleError, PowertoolsError, Rethrow,
                      WrapThrow, ReturnSuccess, ReturnServerError, ReturnNull, BareReturn, ReturnTrue,
                      CallbackError, CallbackSuccess, LogInCallback)
                else Set(Empty, ConsoleError)).oneOf()
    nondet bi = (if (fo == Bindings) Set(Named, Short, Unbound) else Set(Named)).oneOf()
    nondet c = (if (fo == Bodies) Set(true, false) else Set(false)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, body' = b, binding' = bi, commentOff' = c, gate' = g, testCtx' = tc,
          verdict' = (reports(b, c, g) and not(exempt(tc))) }
  }

  action init = step
}
