// Model of eslint-plugin-lambda-security/no-overly-permissive-iam-policy (CWE-732).
// An IAM policy statement that ALLOWS a wildcard is reported: `Resource: '*'`,
// `Action: '*'` (alone or in a list, however the key is quoted), or a
// `Principal` of everyone ('*' or { AWS: '*' }) — including a Lambda
// AddPermission that makes the function publicly invocable. Wherever the
// statement is written: a policy document built in Lambda code, inline in an
// IAM command, or returned by an API Gateway Lambda authorizer. A `Deny`
// statement on '*' restricts, it does not grant (the canonical authorizer
// "deny everything" policy). Scoped resources (an ARN, a bucket prefix, a
// template ARN, `event.methodArn`), a single action and a named principal
// are fine. Only in Lambda files. `allowInTests` (default true) exempts tests.
module no_overly_permissive_iam_policy {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Field = ResourceStar | ActionStar | ResourceArrayStar | QuotedResourceStar | ScopedResource
             | ScopedTemplate | MethodArn | PrincipalStar | PrincipalAwsStar | PrincipalAccount
             | PrincipalService
  type Effect = Allow | Deny
  type Ctx = PolicyConst | AuthorizerReturn | InlineCommand | AddPermission
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Fields | Effects | Ctxs | Gates

  pure def wildcard(f: Field): bool =
    Set(ResourceStar, ActionStar, ResourceArrayStar, QuotedResourceStar, PrincipalStar,
        PrincipalAwsStar).contains(f)
  pure def reports(f: Field, e: Effect, g: Gate): bool =
    wildcard(f) and e == Allow and g != NoEvidence

  var focus: Focus
  var entry: Field
  var effect: Effect
  var ctx: Ctx
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Fields, Effects, Ctxs, Gates).oneOf()
    // The gates use the authorizer: it imports nothing, so the gate is all
    // the evidence the file has.
    nondet c = (if (fo == Ctxs) Set(PolicyConst, AuthorizerReturn, InlineCommand, AddPermission)
                else if (fo == Gates) Set(AuthorizerReturn)
                else Set(PolicyConst)).oneOf()
    nondet f = (if (fo == Fields)
                  Set(ResourceStar, ActionStar, ResourceArrayStar, QuotedResourceStar, ScopedResource,
                      ScopedTemplate, MethodArn, PrincipalStar, PrincipalAwsStar, PrincipalAccount,
                      PrincipalService)
                else if (fo == Effects) Set(ResourceStar, ActionStar)
                else if (fo == Ctxs and c == AddPermission) Set(PrincipalStar, PrincipalService)
                else Set(ResourceStar, ScopedResource)).oneOf()
    nondet e = (if (fo == Effects) Set(Allow, Deny) else Set(Allow)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, entry' = f, effect' = e, ctx' = c, gate' = g, testCtx' = tc,
          verdict' = (reports(f, e, g) and not(exempt(tc))) }
  }

  action init = step
}
