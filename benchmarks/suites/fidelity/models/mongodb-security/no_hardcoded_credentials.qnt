// Model of eslint-plugin-mongodb-security/no-hardcoded-credentials (CWE-798).
// MongoDB connection options that carry a hardcoded `user`, `pass`,
// `username` or `password` — or `auth: { username, password }` for the
// driver — put credentials in source control. A string literal or a
// substitution-free template is hardcoded; `process.env`, a config module and
// options with no credential key are fine. `authSource` names the database
// that holds the users, not a secret (CWE-798 is about the secret), so a
// literal one is fine. Judged on Mongoose `connect` / `createConnection` and
// the driver's `new MongoClient` / `MongoClient.connect`; a file with no Mongo
// is not judged. Another client's options in a Mongo file (a Redis
// `createClient({ password: '...' })`) are left out of the domain: the rule
// deliberately reports any credential-keyed literal in a Mongo file, config
// objects included, and that one is a real hardcoded secret.
// The same objects written as a query filter, an update document or an
// aggregation stage (`User.findOne({ username: 'admin' })`, `updateMany`,
// `aggregate([{ $match }])`, a const filter passed to `countDocuments`) are
// data, not connection options: a `user` / `username` there is the account
// being looked up, so only a literal `pass` / `password` is still reported.
module no_hardcoded_credentials {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Site =
    | MongooseConnect | RequireConnect | CreateConnection | NewMongoClient | StaticClientConnect | NoImport
    | ModelFindOne | CollectionUpdate | AggregateMatch | BoundFilter
  type Opts =
    | UserPassLiteral | PassOnly | UserOnly | PasswordKey | AuthSourceOnly | AuthNested
    | TemplatePass | EnvUserLiteralPass
    | FromEnv | FromConfig | AuthNestedEnv | NoCredentials

  pure def hardcoded(o: Opts): bool = match o {
    | UserPassLiteral => true
    | PassOnly => true
    | UserOnly => true
    | PasswordKey => true
    | AuthSourceOnly => false
    | AuthNested => true
    | TemplatePass => true
    | EnvUserLiteralPass => true
    | FromEnv => false
    | FromConfig => false
    | AuthNestedEnv => false
    | NoCredentials => false
  }

  // A literal secret (`pass` / `password`), as opposed to an account name.
  pure def hardcodedSecret(o: Opts): bool = match o {
    | UserPassLiteral => true
    | PassOnly => true
    | UserOnly => false
    | PasswordKey => true
    | AuthSourceOnly => false
    | AuthNested => true
    | TemplatePass => true
    | EnvUserLiteralPass => true
    | FromEnv => false
    | FromConfig => false
    | AuthNestedEnv => false
    | NoCredentials => false
  }

  pure def mongoSite(s: Site): bool = s != NoImport
  pure def dataDocument(s: Site): bool =
    Set(ModelFindOne, CollectionUpdate, AggregateMatch, BoundFilter).contains(s)

  pure def reports(s: Site, o: Opts): bool =
    mongoSite(s) and (if (dataDocument(s)) hardcodedSecret(o) else hardcoded(o))

  var site: Site
  var opts: Opts
  var verdict: bool

  action step = {
    nondet s = Set(
      MongooseConnect, RequireConnect, CreateConnection, NewMongoClient, StaticClientConnect, NoImport,
      ModelFindOne, CollectionUpdate, AggregateMatch, BoundFilter,
    ).oneOf()
    nondet o = Set(
      UserPassLiteral, PassOnly, UserOnly, PasswordKey, AuthSourceOnly, AuthNested,
      TemplatePass, EnvUserLiteralPass, FromEnv, FromConfig, AuthNestedEnv, NoCredentials,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      site' = s,
      opts' = o,
      testCtx' = tc,
      verdict' = (reports(s, o) and not(exempt(tc))),
    }
  }

  action init = step
}
