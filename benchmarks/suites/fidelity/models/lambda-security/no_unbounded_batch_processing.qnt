// Model of eslint-plugin-lambda-security/no-unbounded-batch-processing (CWE-770).
// A Lambda handler that processes its batch (`event.Records` from SQS, SNS,
// DynamoDB/Kinesis streams; read directly, by subscript or destructured;
// iterated with for…of, map or forEach) without bounding it is reported.
// Bounding means checking the batch's own `.length` against a limit, or
// processing `Records.slice(0, n)`. A literal limit above `maxBatchSize`
// (default 100) does not bound it. A slice or a length check on something
// else (a message id, a tenant string) bounds nothing. A handler that reads no
// batch is fine. The event parameter is recognised by name: `eventParamNames`
// (default event, evt, e, request, req) replaces the list. Only in Lambda
// files. `allowInTests` (default true) exempts test files.
module no_unbounded_batch_processing {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Access = ForOf | MapAll | ForEach | Destructured | Bracket | NoBatch
  type Bound = NoBound | LengthConst | LengthSmall | LengthLarge | SliceSmall | SliceLarge
             | UnrelatedSlice | UnrelatedLength
  type Param = Event | Evt | PayloadOpt | PayloadNoOpt
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Bounds | Accesses | Params | Gates

  pure def bounded(b: Bound, bigMax: bool): bool =
    Set(LengthConst, LengthSmall, SliceSmall).contains(b)
    or ((b == LengthLarge or b == SliceLarge) and bigMax)
  pure def recognised(p: Param): bool = p != PayloadNoOpt
  pure def reports(a: Access, b: Bound, bigMax: bool, p: Param, g: Gate): bool =
    a != NoBatch and not(bounded(b, bigMax)) and recognised(p) and g != NoEvidence

  var focus: Focus
  var access: Access
  var bound: Bound
  var bigMax: bool
  var param: Param
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Bounds, Accesses, Params, Gates).oneOf()
    nondet a = (if (fo == Accesses) Set(ForOf, MapAll, ForEach, Destructured, Bracket, NoBatch)
                else Set(ForOf)).oneOf()
    nondet b = (if (fo == Bounds)
                  Set(NoBound, LengthConst, LengthSmall, LengthLarge, SliceSmall, SliceLarge,
                      UnrelatedSlice, UnrelatedLength)
                else if (fo == Accesses) Set(NoBound, SliceSmall)
                else Set(NoBound)).oneOf()
    nondet bm = (if (fo == Bounds) Set(true, false) else Set(false)).oneOf()
    nondet p = (if (fo == Params) Set(Event, Evt, PayloadOpt, PayloadNoOpt) else Set(Event)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, access' = a, bound' = b, bigMax' = bm, param' = p, gate' = g, testCtx' = tc,
          verdict' = (reports(a, b, bm, p, g) and not(exempt(tc))) }
  }

  action init = step
}
