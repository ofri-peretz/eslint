// Model of eslint-plugin-nestjs-security/no-missing-validation-pipe (CWE-20).
// Request input bound with @Body()/@Query() must reach a ValidationPipe.
// With a global pipe (assumeGlobalPipes) only shapes no ValidationPipe can
// validate (any, unknown, object, inline literal, no annotation) are reported,
// unless requireExplicitPipe asks for a per-route pipe anyway.
// The cross-file scan (detectGlobalPipes) is disabled in the harness.
module no_missing_validation_pipe {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Deco = BodyDeco | QueryDeco | NoDeco
  type ParamType = DtoClass | AnyT | UnknownT | ObjectT | InlineLiteral | NoAnnotation
  type Pipe =
    | NoPipe
    | HandlerNew      // @UsePipes(new ValidationPipe())
    | HandlerRef      // @UsePipes(ValidationPipe)
    | ClassLevel      // @UsePipes(new ValidationPipe()) on the controller
    | ParamPipe       // @Body(new ValidationPipe())
    | OtherPipe       // @UsePipes(new ParseIntPipe()) — not a ValidationPipe

  pure def unvalidatable(t: ParamType): bool = t != DtoClass

  pure def hasValidationPipe(p: Pipe): bool =
    p == HandlerNew or p == HandlerRef or p == ClassLevel or p == ParamPipe

  pure def reports(route: bool, d: Deco, t: ParamType, p: Pipe,
                   globalPipe: bool, requireExplicit: bool): bool =
    if (not(route) or d == NoDeco) false
    else if (hasValidationPipe(p)) false
    else if (globalPipe) requireExplicit or unvalidatable(t)
    else true

  var route: bool
  var deco: Deco
  var paramType: ParamType
  var pipe: Pipe
  var globalPipe: bool
  var requireExplicit: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    // A non-route method, and a parameter with no input decorator, are never
    // reported whatever else holds: each is sampled once rather than crossed
    // with every type and option (keeps the domain small enough for the
    // test-file dimension).
    nondet r = Set(true, false).oneOf()
    nondet d = (if (r) Set(BodyDeco, QueryDeco, NoDeco) else Set(BodyDeco)).oneOf()
    nondet t = (if (r and d != NoDeco)
                  Set(DtoClass, AnyT, UnknownT, ObjectT, InlineLiteral, NoAnnotation)
                else Set(DtoClass)).oneOf()
    nondet p = (if (r) Set(NoPipe, HandlerNew, HandlerRef, ClassLevel, ParamPipe, OtherPipe)
                else Set(NoPipe)).oneOf()
    nondet g = (if (r and d != NoDeco) Set(true, false) else Set(false)).oneOf()
    nondet x = (if (r and d != NoDeco) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      route' = r, deco' = d, paramType' = t, pipe' = p,
      globalPipe' = g, requireExplicit' = x,
      testCtx' = tc, verdict' = (reports(r, d, t, p, g, x) and not(exempt(tc))),
    }
  }

  action init = step
}
