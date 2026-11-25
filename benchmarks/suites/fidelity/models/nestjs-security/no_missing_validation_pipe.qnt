// Model of eslint-plugin-nestjs-security/no-missing-validation-pipe (CWE-20).
// Request input bound with @Body()/@Query() must reach a ValidationPipe.
// With a global pipe (assumeGlobalPipes) only shapes no ValidationPipe can
// validate (any, unknown, object, inline literal, no annotation) are reported,
// unless requireExplicitPipe asks for a per-route pipe anyway.
// NestJS 12 Standard Schema: `@Body({ schema })` only attaches the schema. It is
// enforced when StandardSchemaValidationPipe runs on the parameter, the handler
// or the controller (or a global pipe is assumed), and by nothing otherwise —
// and that pipe validates nothing for a parameter that declares no schema.
// The cross-file scan (detectGlobalPipes) is disabled in the harness.
module no_missing_validation_pipe {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  // The keyed forms bind one named value: `@Param('id')` is a URL path segment
  // (always a string), and an unannotated `@Query('page')` is validated exactly
  // as much as one annotated `string`. Neither is reported. A keyed body field
  // is whatever JSON the client sent, and is.
  type Deco = BodyDeco | QueryDeco | NoDeco | ParamKey | QueryKey | BodyKey
  pure def keyed(d: Deco): bool = d == ParamKey or d == QueryKey or d == BodyKey
  type ParamType = DtoClass | AnyT | UnknownT | ObjectT | InlineLiteral | NoAnnotation
  type Pipe =
    | NoPipe
    | HandlerNew      // @UsePipes(new ValidationPipe())
    | HandlerRef      // @UsePipes(ValidationPipe)
    | ClassLevel      // @UsePipes(new ValidationPipe()) on the controller
    | ParamPipe       // @Body(new ValidationPipe())
    | OtherPipe       // @UsePipes(new ParseIntPipe()) — not a ValidationPipe
    | SchemaHandler   // @UsePipes(new StandardSchemaValidationPipe())
    | SchemaClass     // @UsePipes(StandardSchemaValidationPipe) on the controller
    | SchemaParam     // @Body(…, new StandardSchemaValidationPipe())

  pure def unvalidatable(t: ParamType): bool = t != DtoClass

  pure def hasValidationPipe(p: Pipe): bool =
    p == HandlerNew or p == HandlerRef or p == ClassLevel or p == ParamPipe

  pure def hasSchemaPipe(p: Pipe): bool =
    p == SchemaHandler or p == SchemaClass or p == SchemaParam

  pure def reports(route: bool, d: Deco, t: ParamType, p: Pipe, schema: bool,
                   globalPipe: bool, requireExplicit: bool): bool =
    if (not(route) or d == NoDeco) false
    else if (hasValidationPipe(p)) false
    // A declared schema is enforced by the schema pipe, whatever the type.
    else if (schema) not(hasSchemaPipe(p) or (globalPipe and not(requireExplicit)))
    else if (d == ParamKey) false
    else if (d == QueryKey and t == NoAnnotation) false
    else if (globalPipe) requireExplicit or unvalidatable(t)
    else true

  var route: bool
  var deco: Deco
  var paramType: ParamType
  var pipe: Pipe
  var schema: bool
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
    nondet d = (if (r) Set(BodyDeco, QueryDeco, NoDeco, ParamKey, QueryKey, BodyKey)
                else Set(BodyDeco)).oneOf()
    nondet sc = (if (r and d != NoDeco) Set(true, false) else Set(false)).oneOf()
    // With a schema the declared type decides nothing, so two types stand for
    // all six there.
    nondet t = (if (r and d != NoDeco and not(sc))
                  Set(DtoClass, AnyT, UnknownT, ObjectT, InlineLiteral, NoAnnotation)
                else if (sc) Set(DtoClass, AnyT)
                else Set(DtoClass)).oneOf()
    // The keyed forms differ from the whole-object ones in the type and schema
    // dimensions only, so they are crossed with two pipes and one
    // requireExplicit value rather than all nine and both.
    nondet p = (if (r and keyed(d)) Set(NoPipe, SchemaHandler)
                else if (r) Set(NoPipe, HandlerNew, HandlerRef, ClassLevel, ParamPipe, OtherPipe,
                                SchemaHandler, SchemaClass, SchemaParam)
                else Set(NoPipe)).oneOf()
    nondet g = (if (r and d != NoDeco) Set(true, false) else Set(false)).oneOf()
    nondet x = (if (r and d != NoDeco and not(keyed(d))) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      route' = r, deco' = d, paramType' = t, pipe' = p, schema' = sc,
      globalPipe' = g, requireExplicit' = x,
      testCtx' = tc, verdict' = (reports(r, d, t, p, sc, g, x) and not(exempt(tc))),
    }
  }

  action init = step
}
