// Model of eslint-plugin-nestjs-security/no-unsafe-multer-filename (CWE-22).
// A multer diskStorage `filename` callback that hands file.originalname to its
// callback untouched (raw, prefixed, concatenated, via a local, destructured or
// bracket-read) is reported. Any function call on the value stops the check,
// and a `destination` callback is not the stored name. Whether the file also
// imports @nestjs/* is irrelevant: multer storage often lives in its own module.
module no_unsafe_multer_filename {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Form = MethodForm | ArrowProp | AsyncArrowProp
  type Value =
    | Raw            // cb(null, file.originalname)
    | TemplatePrefix // `${Date.now()}-${file.originalname}`
    | Concat         // Date.now() + '-' + file.originalname
    | ViaLocal       // const n = file.originalname; cb(null, n)
    | ViaLocalConcat // let o = file.originalname; cb(null, Date.now() + '-' + o)
    | Destructured   // (req, { originalname }, cb) => cb(null, originalname)
    | Bracket        // file['originalname']
    | Extname        // `${randomUUID()}${extname(file.originalname)}`
    | Basename       // basename(file.originalname)
    | MethodCall     // file.originalname.toLowerCase()
    | Generated      // randomUUID()
  type Spelling = NamedImport | NamespaceImport | RequireDestructure
  type Key = FilenameKey | DestinationKey

  pure def raw(v: Value): bool =
    v == Raw or v == TemplatePrefix or v == Concat or v == ViaLocal or v == ViaLocalConcat
      or v == Destructured or v == Bracket

  pure def reports(f: Form, v: Value, cbName: bool, sp: Spelling, k: Key, nestImport: bool): bool =
    k == FilenameKey and raw(v)

  var form: Form
  var value: Value
  var cbIsCd: bool
  var spelling: Spelling
  var key: Key
  var nestImport: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    // Every spelling (handler form, callback name, import) is crossed with
    // one raw and one sanitised value; the other values are sampled in the
    // first spelling only.
    nondet v = Set(Raw, TemplatePrefix, Concat, ViaLocal, ViaLocalConcat, Destructured, Bracket,
                   Extname, Basename, MethodCall, Generated).oneOf()
    val allSpellings = v == Raw or v == Extname
    nondet f = (if (allSpellings) Set(MethodForm, ArrowProp, AsyncArrowProp) else Set(MethodForm)).oneOf()
    nondet c = (if (allSpellings) Set(true, false) else Set(false)).oneOf()
    nondet sp = (if (allSpellings) Set(NamedImport, NamespaceImport, RequireDestructure)
                 else Set(NamedImport)).oneOf()
    nondet k = Set(FilenameKey, DestinationKey).oneOf()
    nondet n = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      form' = f, value' = v, cbIsCd' = c, spelling' = sp, key' = k, nestImport' = n,
      testCtx' = tc, verdict' = (reports(f, v, c, sp, k, n) and not(exempt(tc))),
    }
  }

  action init = step
}
