// Model of eslint-plugin-mongodb-security/no-hardcoded-connection-string
// (CWE-798). A `mongodb://` or `mongodb+srv://` URI written into the source —
// a string literal or a template with no substitutions — leaks the host and,
// usually, the credentials through source control and bundles; the docs report
// it with or without credentials in it. Wherever it is written: passed to
// `connect`, `createConnection` or `new MongoClient`, or held in a const. A URI
// read from the environment or a config module, another scheme's URI, and the
// same text in a comment are fine. A file with no Mongo import that still
// holds a `mongodb://` literal (a `config.ts`) is the leak itself: the URI is
// its own evidence.
module no_hardcoded_connection_string {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Site = MongooseConnect | RequireConnect | CreateConnection | NewMongoClient | ConstThenConnect | ExportedConst
  type Uri =
    | WithCreds | NoCreds | SrvWithCreds | SrvNoCreds | TemplateWithCreds
    | FromEnv | FromConfig | OtherScheme | InComment

  pure def hardcoded(u: Uri): bool = match u {
    | WithCreds => true
    | NoCreds => true
    | SrvWithCreds => true
    | SrvNoCreds => true
    | TemplateWithCreds => true
    | FromEnv => false
    | FromConfig => false
    | OtherScheme => false
    | InComment => false
  }

  pure def reports(s: Site, u: Uri): bool = hardcoded(u)

  var site: Site
  var uri: Uri
  var verdict: bool

  action step = {
    nondet s = Set(MongooseConnect, RequireConnect, CreateConnection, NewMongoClient, ConstThenConnect, ExportedConst).oneOf()
    nondet u = Set(WithCreds, NoCreds, SrvWithCreds, SrvNoCreds, TemplateWithCreds, FromEnv, FromConfig, OtherScheme, InComment).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      site' = s,
      uri' = u,
      testCtx' = tc,
      verdict' = (reports(s, u) and not(exempt(tc))),
    }
  }

  action init = step
}
