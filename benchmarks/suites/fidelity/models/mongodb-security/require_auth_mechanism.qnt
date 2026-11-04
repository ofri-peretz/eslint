// Model of eslint-plugin-mongodb-security/require-auth-mechanism (CWE-287).
// A MongoDB connection that authenticates (credentials in the URI or in the
// options) must name its `authMechanism` — in the options or as an
// `authMechanism=` URI parameter — so the driver cannot fall back to a weaker
// one. Which mechanism is named is not judged. Only a receiver bound to a
// `mongodb`/`mongoose` import (connect, createConnection, a named `connect`) or
// named `mongo*` is a MongoDB connection; a Redis client or a TypeORM query
// runner `.connect()` is not, and a file with no Mongo is not judged.
// `allowInTests` (default true) also covers `test/` and `fixtures/` dirs.
module require_auth_mechanism {
  type TestCtx = Prod | TestDefault | TestFlip | TestDirDefault | FixturesDefault | TestDirFlip
  pure def exempt(t: TestCtx): bool =
    t == TestDefault or t == TestDirDefault or t == FixturesDefault
  var testCtx: TestCtx

  type Site = MongooseConnect | RequireConnect | CreateConnection | NamedConnect | MongoNamed | RedisClient | QueryRunner | Unbound | NoImport
  type Conn =
    | UriCredsNoMech | UriCredsWithMech | OptsCredsNoMech | OptsAuthNestedNoMech
    | OptsMechScram | OptsMechX509 | OptsMechAws | OptsCredsAndMech

  pure def missing(c: Conn): bool = match c {
    | UriCredsNoMech => true
    | UriCredsWithMech => false
    | OptsCredsNoMech => true
    | OptsAuthNestedNoMech => true
    | OptsMechScram => false
    | OptsMechX509 => false
    | OptsMechAws => false
    | OptsCredsAndMech => false
  }

  // The URI is written as a `mongodb://` literal: Mongo evidence on its own.
  pure def literalUri(c: Conn): bool = match c {
    | UriCredsNoMech => true
    | UriCredsWithMech => true
    | OptsCredsNoMech => false
    | OptsAuthNestedNoMech => false
    | OptsMechScram => false
    | OptsMechX509 => false
    | OptsMechAws => false
    | OptsCredsAndMech => false
  }

  // `Unbound`: `mongoose.connect(...)` with no import. The receiver is named
  // `mongo*`, so it is judged when the file holds Mongo evidence: a literal URI.
  pure def mongoSite(s: Site, c: Conn): bool = match s {
    | RedisClient => false
    | QueryRunner => false
    | NoImport => false
    | Unbound => literalUri(c)
    | _ => true
  }

  pure def reports(s: Site, c: Conn): bool = mongoSite(s, c) and missing(c)

  var site: Site
  var conn: Conn
  var verdict: bool

  action step = {
    nondet s = Set(MongooseConnect, RequireConnect, CreateConnection, NamedConnect, MongoNamed, RedisClient, QueryRunner, Unbound, NoImport).oneOf()
    nondet c = Set(
      UriCredsNoMech, UriCredsWithMech, OptsCredsNoMech, OptsAuthNestedNoMech,
      OptsMechScram, OptsMechX509, OptsMechAws, OptsCredsAndMech,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip, TestDirDefault, FixturesDefault, TestDirFlip).oneOf()
    all {
      site' = s,
      conn' = c,
      testCtx' = tc,
      verdict' = (reports(s, c) and not(exempt(tc))),
    }
  }

  action init = step
}
