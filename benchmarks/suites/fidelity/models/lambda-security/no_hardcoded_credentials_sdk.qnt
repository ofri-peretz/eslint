// Model of eslint-plugin-lambda-security/no-hardcoded-credentials-sdk (CWE-798).
// An AWS SDK client configured with a literal credential is reported: an
// access key id that is a real key (AKIA… IAM user / ASIA… STS), or a literal
// secret access key of 20+ characters (AWS secrets are 40), as a string or a
// static template literal. Every official way to hand the SDK a credential
// counts: v3 `new XClient({ credentials: {…} })` imported from
// `@aws-sdk/client-*` (named, renamed, namespace, require); v2 `new AWS.S3({…})`
// with top-level or nested keys, `AWS.config.update({…})`, and
// `new AWS.Credentials(key, secret)`. Credentials from the environment, a
// provider (`fromNodeProviderChain()`), the execution role (no credentials),
// or LocalStack's short placeholders ('test') are fine. Only in Lambda files
// (the SDK import is evidence). `allowInTests` (default true) exempts tests.
module no_hardcoded_credentials_sdk {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Value = AkiaBoth | AsiaBoth | AkiaOnly | SecretOnly | TemplateKey | LocalStack | EnvBoth
             | Provider | NoCreds | NonKeyId
  type Client = V3Named | V3Dynamo | V3Kms | V3Renamed | V3Namespace | V3Require
              | V2Service | V2Nested | V2DocClient | V2ConfigUpdate | V2CredentialsCtor
  type Focus = Values | Clients

  pure def hardcoded(v: Value): bool =
    Set(AkiaBoth, AsiaBoth, AkiaOnly, SecretOnly, TemplateKey).contains(v)

  var focus: Focus
  var value: Value
  var client: Client
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Values, Clients).oneOf()
    nondet v = (if (fo == Values)
                  Set(AkiaBoth, AsiaBoth, AkiaOnly, SecretOnly, TemplateKey, LocalStack, EnvBoth,
                      Provider, NoCreds, NonKeyId)
                else Set(AkiaBoth, EnvBoth, LocalStack)).oneOf()
    nondet c = (if (fo == Clients)
                  Set(V3Named, V3Dynamo, V3Kms, V3Renamed, V3Namespace, V3Require, V2Service,
                      V2Nested, V2DocClient, V2ConfigUpdate, V2CredentialsCtor)
                else Set(V3Named)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, value' = v, client' = c, testCtx' = tc,
          verdict' = (hardcoded(v) and not(exempt(tc))) }
  }

  action init = step
}
