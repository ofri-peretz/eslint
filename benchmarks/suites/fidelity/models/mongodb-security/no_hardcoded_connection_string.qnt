// Model of eslint-plugin-mongodb-security/no-hardcoded-connection-string
// (CWE-798). A `mongodb://` or `mongodb+srv://` URI written into the source —
// a string literal or a template with no substitutions — leaks the host and,
// usually, the credentials through source control and bundles; the docs report
// it with or without credentials in it, except a credential-free URI whose
// every host is loopback (`localhost`, `127.x.x.x`, `[::1]`): the tutorial
// default behind an env var, with no secret to leak and no remote host to pin
// (#1616). Loopback with userinfo, or a remote host without it, still reports.
// Wherever it is written: passed to
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
    | WithCreds | LoopbackNoCreds | Loopback127 | LoopbackV6 | RemoteNoCreds | LoopbackWithCreds | SrvWithCreds | SrvNoCreds | TemplateWithCreds
    | FromEnv | FromConfig | OtherScheme | InComment

  pure def hardcoded(u: Uri): bool = match u {
    | WithCreds => true
    | LoopbackNoCreds => false
    | Loopback127 => false
    | LoopbackV6 => false
    | RemoteNoCreds => true
    | LoopbackWithCreds => true
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
    nondet u = Set(WithCreds, LoopbackNoCreds, Loopback127, LoopbackV6, RemoteNoCreds, LoopbackWithCreds, SrvWithCreds, SrvNoCreds, TemplateWithCreds, FromEnv, FromConfig, OtherScheme, InComment).oneOf()
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
