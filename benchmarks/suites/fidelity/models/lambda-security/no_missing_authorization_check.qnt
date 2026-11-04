// Model of eslint-plugin-lambda-security/no-missing-authorization-check (CWE-862).
// A Lambda handler (a function taking the event) that performs a privileged
// operation — a database write/delete, an AWS SDK v3 `send`, an SDK v2
// DocumentClient/S3 mutation, a Lambda invoke — without first establishing
// who the caller is, is reported. Establishing it means reading the
// authorizer's verdict off the event (Cognito `requestContext.authorizer.claims`,
// HTTP API JWT `authorizer.jwt.claims`, IAM `requestContext.identity`) or
// verifying the Authorization header, and refusing (401/403) otherwise. A
// value the client sent in the body is not identity, whatever it is called
// (`subject`, `userId`). Work that reaches nothing outside the process
// (arithmetic, a `new Map()` cache) needs no authorization. Only in Lambda
// files. `handlerPatterns`, when set, limits the rule to files whose path
// contains one of them. `allowInTests` (default true) exempts test files.
module no_missing_authorization_check {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Op = DbDelete | DynamoSend | DocDelete | S3Put | LambdaInvoke | Compute | MapDelete
  type Auth = NoAuth | CognitoClaims | JwtV2 | IamIdentity | VerifyHeader | BodySubject | BodyUserId
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type File = PlainFile | PatternMatch | PatternMiss
  type Focus = Ops | Auths | Gates | Files

  pure def privileged(o: Op): bool = o != Compute and o != MapDelete
  pure def authorized(a: Auth): bool = Set(CognitoClaims, JwtV2, IamIdentity, VerifyHeader).contains(a)
  pure def reports(o: Op, a: Auth, g: Gate, f: File): bool =
    privileged(o) and not(authorized(a)) and g != NoEvidence and f != PatternMiss

  var focus: Focus
  var op: Op
  var auth: Auth
  var gate: Gate
  var file: File
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Ops, Auths, Gates, Files).oneOf()
    nondet o = (if (fo == Ops)
                  Set(DbDelete, DynamoSend, DocDelete, S3Put, LambdaInvoke, Compute, MapDelete)
                else Set(DbDelete)).oneOf()
    nondet a = (if (fo == Auths)
                  Set(NoAuth, CognitoClaims, JwtV2, IamIdentity, VerifyHeader, BodySubject, BodyUserId)
                else if (fo == Ops) Set(NoAuth, CognitoClaims)
                else Set(NoAuth)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet f = (if (fo == Files) Set(PlainFile, PatternMatch, PatternMiss) else Set(PlainFile)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, op' = o, auth' = a, gate' = g, file' = f, testCtx' = tc,
          verdict' = (reports(o, a, g, f) and not(exempt(tc))) }
  }

  action init = step
}
