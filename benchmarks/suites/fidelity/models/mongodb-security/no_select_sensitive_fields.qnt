// Model of eslint-plugin-mongodb-security/no-select-sensitive-fields (CWE-200).
// A read that returns a sensitive field leaks it (a password hash in
// `res.json(user)`). Reported when the query itself names a sensitive field
// for inclusion (`.select('+password')`, `.select('password name')`, a
// `{ password: 1 }` projection), or when it has no projection at all and a
// sensitive field is visible in the file (a `new Schema({...})` key) — with
// `requireVisibleSensitiveField: false`, every unprojected read. Excluding the
// field (`-password`, `{ password: 0 }`), selecting only other fields (a
// Mongoose projection as the second argument, a string or an object, or a
// `.select()`), or a field that merely starts with a sensitive name
// (`passwordUpdatedAt`) is fine. `sensitiveFields` replaces the default list
// (password, refreshToken, apiKey, secret). A `password` member of an
// interface makes the field visible as much as a schema key. Only a plausible Mongo receiver is
// judged; a generic repository and a file with no Mongo are not.
module no_select_sensitive_fields {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Receiver = Model | Nest | NoImport | Repo
  type Query =
    | Plain | SelectPlus | SelectInclude | SelectPlusSsn | ProjObjInclude
    | SelectExclude | SelectSafe | SelectSimilarName | ProjString | ProjObjExclude
  // The file declares a `password` field (a schema key, or an interface member
  // where a schema would make the file Mongo on its own), or none is visible.
  type Visibility = SchemaVisible | NotVisible
  // Default list; `sensitiveFields: ['ssn']`; `requireVisibleSensitiveField: false`.
  type Opt = Default | CustomSsn | NoRequireVisible

  pure def passwordSensitive(o: Opt): bool = o != CustomSsn
  pure def ssnSensitive(o: Opt): bool = o == CustomSsn

  pure def exposes(q: Query, v: Visibility, o: Opt): bool = match q {
    | Plain => (passwordSensitive(o) and v == SchemaVisible) or o == NoRequireVisible
    | SelectPlus => passwordSensitive(o)
    | SelectInclude => passwordSensitive(o)
    | ProjObjInclude => passwordSensitive(o)
    | SelectPlusSsn => ssnSensitive(o)
    | SelectExclude => false
    | SelectSafe => false
    | SelectSimilarName => false
    | ProjString => false
    | ProjObjExclude => false
  }

  pure def mongoRecv(r: Receiver): bool = r == Model or r == Nest

  pure def reports(r: Receiver, q: Query, v: Visibility, o: Opt): bool =
    mongoRecv(r) and exposes(q, v, o)

  var receiver: Receiver
  var query: Query
  var visibility: Visibility
  var opt: Opt
  var verdict: bool

  action step = {
    nondet r = Set(Model, Nest, NoImport, Repo).oneOf()
    nondet q = Set(
      Plain, SelectPlus, SelectInclude, SelectPlusSsn, ProjObjInclude,
      SelectExclude, SelectSafe, SelectSimilarName, ProjString, ProjObjExclude,
    ).oneOf()
    nondet v = Set(SchemaVisible, NotVisible).oneOf()
    nondet o = Set(Default, CustomSsn, NoRequireVisible).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      receiver' = r,
      query' = q,
      visibility' = v,
      opt' = o,
      testCtx' = tc,
      verdict' = (reports(r, q, v, o) and not(exempt(tc))),
    }
  }

  action init = step
}
