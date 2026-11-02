// Model of eslint-plugin-vercel-ai-security/require-audit-logging (CWE-778).
// An AI SDK call must be preceded by a logging call (console.*, logger.*,
// debug(...) — by callee path) in the same function, or carry telemetry with
// isEnabled: true. Logging after the call, a non-logging call that merely
// contains "log" (showDialog), or disabled telemetry does not count.
module require_audit_logging {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Logging =
    | NoLogging
    | ConsoleLogBefore
    | LoggerInfoBefore
    | DebugBefore
    | ShowDialogBefore
    | TelemetryEnabled   // experimental_telemetry: { isEnabled: true }
    | TelemetryDisabled  // experimental_telemetry: { isEnabled: false }
    | LogAfter           // logger.info after the call
  type Fn = GenerateText | StreamText
  type Spelling = Named | Namespace

  pure def logged(l: Logging): bool =
    l == ConsoleLogBefore or l == LoggerInfoBefore or l == DebugBefore or l == TelemetryEnabled

  pure def reports(importsAi: bool, l: Logging, f: Fn, sp: Spelling): bool =
    importsAi and not(logged(l))

  var importsAi: bool
  var logging: Logging
  var fn: Fn
  var spelling: Spelling
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet l = Set(NoLogging, ConsoleLogBefore, LoggerInfoBefore, DebugBefore, ShowDialogBefore,
                   TelemetryEnabled, TelemetryDisabled, LogAfter).oneOf()
    nondet f = Set(GenerateText, StreamText).oneOf()
    nondet sp = Set(Named, Namespace).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { importsAi' = i, logging' = l, fn' = f, spelling' = sp, testCtx' = tc, verdict' = (reports(i, l, f, sp) and not(exempt(tc))) }
  }

  action init = step
}
