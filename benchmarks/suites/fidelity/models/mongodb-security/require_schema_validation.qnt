// Model of eslint-plugin-mongodb-security/require-schema-validation (CWE-20).
// A Mongoose schema whose fields declare only a type accepts arbitrary data.
// Each field needs a validator — `required`, `enum`, `match`, `min`/`max`,
// `minlength`/`maxlength` or a `validate` — and a `default` is not one; a
// schema with an unvalidated field next to validated ones is still reported.
// Every spelling of Mongoose's `Schema` counts (named, renamed, `mongoose.`,
// required, and a `Schema` re-exported through a relative module — the
// idiomatic layout, which the plugin's file gate deliberately reads as
// Mongoose); a `Schema` from another library is not judged. The shorthand
// `{ name: String }` is deliberately not reported (the rule's own tests pin
// it valid), so it is left out of this domain.
module require_schema_validation {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx

  type Spelling = Named | Renamed | MongooseMember | Require | OtherLibrary | Relative
  type Fields =
    | TypeOnly | DefaultOnly | MixedValidated
    | Required | Enum | Match | MinMax | MaxLength | MinLength | Validate | AllValidated

  pure def unvalidated(f: Fields): bool = match f {
    | TypeOnly => true
    | DefaultOnly => true
    | MixedValidated => true
    | Required => false
    | Enum => false
    | Match => false
    | MinMax => false
    | MaxLength => false
    | MinLength => false
    | Validate => false
    | AllValidated => false
  }

  pure def mongooseSchema(s: Spelling): bool = s != OtherLibrary

  pure def reports(s: Spelling, f: Fields): bool = mongooseSchema(s) and unvalidated(f)

  var spelling: Spelling
  var shape: Fields
  var verdict: bool

  action step = {
    nondet s = Set(Named, Renamed, MongooseMember, Require, OtherLibrary, Relative).oneOf()
    nondet f = Set(
      TypeOnly, DefaultOnly, MixedValidated,
      Required, Enum, Match, MinMax, MaxLength, MinLength, Validate, AllValidated,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      spelling' = s,
      shape' = f,
      testCtx' = tc,
      verdict' = (reports(s, f) and not(exempt(tc))),
    }
  }

  action init = step
}
