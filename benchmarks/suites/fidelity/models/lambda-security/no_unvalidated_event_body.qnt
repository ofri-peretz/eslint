// Model of eslint-plugin-lambda-security/no-unvalidated-event-body (CWE-20).
// A Lambda handler that hands client input off the event — body,
// queryStringParameters, pathParameters, headers, the multi-value forms, the
// v2 rawQueryString; `additionalProperties` adds fields (EventBridge
// `detail`) — to the rest of its code without validation is reported. Passing
// it through a validation method first is fine: zod parse/safeParse, Joi
// validate, or whatever `validationMethodNames` (which REPLACES the default)
// names, like a hand-written `check()`. So is a middy `@middy/validator`
// middleware on the handler (however it is imported), a `typeof` guard, and
// logging it. Event metadata (requestContext.requestId) is not client input.
// The event is the first parameter of a Lambda handler. Only in Lambda files.
// Narrowed: optional chaining (`event.body?.x`) and the default names that
// are not validators (`JSON.parse`, httpJsonBodyParser) are the rule's
// documented choices, not modelled.
// `allowInTests` (default true) exempts test files.
module no_unvalidated_event_body {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Prop = Body | Query | PathParams | Headers | MultiQuery | RawQuery | RequestId | Detail
  type Use = Direct | ZodParse | ZodSafeParse | JoiValidate | CustomCheck | Logged | TypeofGuard
           | MiddyValidator | MiddyValidatorRenamed
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Props | Uses | Gates

  pure def clientInput(p: Prop, extra: bool): bool =
    Set(Body, Query, PathParams, Headers, MultiQuery, RawQuery).contains(p) or (p == Detail and extra)
  pure def validated(u: Use, customNames: bool): bool =
    if (Set(ZodParse, ZodSafeParse, JoiValidate).contains(u)) not(customNames)
    else if (u == CustomCheck) customNames
    else u != Direct
  pure def reports(p: Prop, extra: bool, u: Use, customNames: bool, g: Gate): bool =
    clientInput(p, extra) and not(validated(u, customNames)) and g != NoEvidence

  var focus: Focus
  var prop: Prop
  var extra: bool
  var use: Use
  var customNames: bool
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Props, Uses, Gates).oneOf()
    nondet p = (if (fo == Props)
                  Set(Body, Query, PathParams, Headers, MultiQuery, RawQuery, RequestId, Detail)
                else Set(Query)).oneOf()
    nondet x = (if (fo == Props) Set(true, false) else Set(false)).oneOf()
    nondet u = (if (fo == Uses)
                  Set(Direct, ZodParse, ZodSafeParse, JoiValidate, CustomCheck, Logged, TypeofGuard,
                      MiddyValidator, MiddyValidatorRenamed)
                else Set(Direct)).oneOf()
    nondet cn = (if (fo == Uses) Set(true, false) else Set(false)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, prop' = p, extra' = x, use' = u, customNames' = cn, gate' = g, testCtx' = tc,
          verdict' = (reports(p, x, u, cn, g) and not(exempt(tc))) }
  }

  action init = step
}
