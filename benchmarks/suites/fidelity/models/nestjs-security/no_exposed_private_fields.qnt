// Model of eslint-plugin-nestjs-security/no-exposed-private-fields (CWE-200).
// A sensitive field (matched on token boundaries) of an entity or DTO class
// must be excluded from serialization. sensitivePatterns adds extra terms.
// Whether the file also imports @nestjs/* does not change what the class is:
// an entity file usually imports only typeorm and class-transformer.
module no_exposed_private_fields {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Kind = EntityClass | ResponseDto | PlainClass
  type Field = Password | HashedPassword | PasswordChangedAt | AccessToken | ApiKey | Ssn | Email | CustomTerm
  type Exclusion =
    | NoExclude
    | Exclude              // @Exclude()
    | ExcludeToPlainOnly   // @Exclude({ toPlainOnly: true }) — hidden from responses
    | ExcludeToClassOnly   // @Exclude({ toClassOnly: true }) — still serialized
    | ClassExclude         // @Exclude() on the class, field without @Expose
    | OtherDecorator       // @IsString() — not an exclusion

  pure def sensitive(f: Field, custom: bool): bool = match f {
    | Password => true
    | HashedPassword => true
    | PasswordChangedAt => false
    | AccessToken => true
    | ApiKey => true
    | Ssn => true
    | Email => false
    | CustomTerm => custom
  }

  pure def excluded(e: Exclusion): bool =
    e == Exclude or e == ExcludeToPlainOnly or e == ClassExclude

  pure def reports(k: Kind, f: Field, e: Exclusion, nestImport: bool, custom: bool): bool =
    k != PlainClass and sensitive(f, custom) and not(excluded(e))

  var kind: Kind
  var fieldName: Field
  var exclusion: Exclusion
  var nestImport: bool
  var custom: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet k = Set(EntityClass, ResponseDto, PlainClass).oneOf()
    nondet f = Set(Password, HashedPassword, PasswordChangedAt, AccessToken, ApiKey, Ssn, Email, CustomTerm).oneOf()
    nondet e = Set(NoExclude, Exclude, ExcludeToPlainOnly, ExcludeToClassOnly, ClassExclude, OtherDecorator).oneOf()
    nondet n = Set(true, false).oneOf()
    // `sensitivePatterns` only changes the verdict for the custom term.
    nondet c = (if (f == CustomTerm) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      kind' = k, fieldName' = f, exclusion' = e, nestImport' = n, custom' = c,
      testCtx' = tc, verdict' = (reports(k, f, e, n, c) and not(exempt(tc))),
    }
  }

  action init = step
}
