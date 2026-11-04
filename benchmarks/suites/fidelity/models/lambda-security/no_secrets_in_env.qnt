// Model of eslint-plugin-lambda-security/no-secrets-in-env (CWE-798).
// A secret-named environment variable (password, secret, API key/token,
// client secret, JWT secret, …; `additionalPatterns` adds names) given a
// literal value in code is reported, wherever Lambda environment is defined:
// assigning `process.env.X` / `process.env['X']`, a CDK
// `new lambda.Function(…, { environment })`, the SDK's
// `Environment: { Variables }` (Create/UpdateFunctionConfiguration), or a
// serverless.ts `provider.environment`. Pointing at the secret instead is the
// documented fix and fine: a Secrets Manager / SSM ARN, an SSM parameter path,
// `secret.secretArn`, another env var. An ordinary variable (LOG_LEVEL) is
// fine, and so is a secret-named field in an object that is not an
// environment (a request payload). Only in Lambda/AWS files (CDK and
// Serverless config included). `allowInTests` (default true) exempts tests.
module no_secrets_in_env {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Name = ApiKey | DbPassword | JwtSecret | ClientSecret | PartnerCredential | LogLevel | TableName
  type Value = Literal | StaticTemplate | SecretArn | SsmPath | FromEnv | SecretRef
  type Ctx = ProcessEnvAssign | ProcessEnvBracket | CdkEnvironment | SdkVariables | ServerlessProvider
           | RequestPayload
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Names | Values | Ctxs | Gates

  pure def secretName(n: Name, custom: bool): bool =
    Set(ApiKey, DbPassword, JwtSecret, ClientSecret).contains(n) or (n == PartnerCredential and custom)
  pure def hardcoded(v: Value): bool = v == Literal or v == StaticTemplate
  pure def reports(n: Name, custom: bool, v: Value, c: Ctx, g: Gate): bool =
    secretName(n, custom) and hardcoded(v) and c != RequestPayload and g != NoEvidence

  var focus: Focus
  var name: Name
  var custom: bool
  var value: Value
  var ctx: Ctx
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Names, Values, Ctxs, Gates).oneOf()
    nondet n = (if (fo == Names)
                  Set(ApiKey, DbPassword, JwtSecret, ClientSecret, PartnerCredential, LogLevel, TableName)
                else Set(DbPassword)).oneOf()
    nondet cu = (if (fo == Names) Set(true, false) else Set(false)).oneOf()
    nondet v = (if (fo == Values) Set(Literal, StaticTemplate, SecretArn, SsmPath, FromEnv, SecretRef)
                else if (fo == Ctxs) Set(Literal, SecretArn)
                else Set(Literal)).oneOf()
    nondet c = (if (fo == Ctxs)
                  Set(ProcessEnvAssign, ProcessEnvBracket, CdkEnvironment, SdkVariables,
                      ServerlessProvider, RequestPayload)
                else if (fo == Values) Set(CdkEnvironment)
                else Set(ProcessEnvAssign)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, name' = n, custom' = cu, value' = v, ctx' = c, gate' = g, testCtx' = tc,
          verdict' = (reports(n, cu, v, c, g) and not(exempt(tc))) }
  }

  action init = step
}
