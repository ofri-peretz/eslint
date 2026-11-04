// Model of eslint-plugin-supabase-security/no-public-storage-bucket (CWE-732).
// A bucket created or updated with `public: true` serves every object in it
// to anyone with the URL. Reported on `storage.createBucket(name, opts)` and
// `storage.updateBucket(name, opts)` (dot or quoted member) when the options
// set `public: true` inline (identifier or quoted key), through a same-file
// `const` options object, a `const` flag, or a spread of a same-file const
// object. As at runtime the last write wins: `{ ...PUBLIC, public: false }` is
// private, `{ public: false, ...PUBLIC }` is public. No options, `public:
// false`, unrelated options, and anything the file cannot read (a spread of
// request data, `public: true` followed by an unknown spread, a request-
// derived flag) are silent. Files with no `@supabase/*` import are not judged.
module no_public_storage_bucket {
  type Spelling = Named | Renamed | Require | Namespace | Ssr | NoImport
  type Method = CreateBucket | UpdateBucket
  type Call = Dot | Bracket
  type Opts =
    | PublicTrue | QuotedTrue | ConstOptions | ConstFlag | SpreadConst
    | FalseThenSpreadPublic
    | NoOptions | PublicFalse | OtherOptions | ConstFlagFalse
    | SpreadThenFalse | TrueThenSpreadUnknown | SpreadRequest | RequestFlag

  pure def isPublic(o: Opts): bool = match o {
    | PublicTrue => true
    | QuotedTrue => true
    | ConstOptions => true
    | ConstFlag => true
    | SpreadConst => true
    | FalseThenSpreadPublic => true
    | NoOptions => false
    | PublicFalse => false
    | OtherOptions => false
    | ConstFlagFalse => false
    | SpreadThenFalse => false
    | TrueThenSpreadUnknown => false
    | SpreadRequest => false
    | RequestFlag => false
  }

  pure def reports(sp: Spelling, o: Opts): bool = sp != NoImport and isPublic(o)

  var spelling: Spelling
  var method: Method
  var call: Call
  var opts: Opts
  var verdict: bool

  action step = {
    nondet sp = Set(Named, Renamed, Require, Namespace, Ssr, NoImport).oneOf()
    nondet m = Set(CreateBucket, UpdateBucket).oneOf()
    nondet c = Set(Dot, Bracket).oneOf()
    nondet o = Set(
      PublicTrue, QuotedTrue, ConstOptions, ConstFlag, SpreadConst,
      FalseThenSpreadPublic,
      NoOptions, PublicFalse, OtherOptions, ConstFlagFalse,
      SpreadThenFalse, TrueThenSpreadUnknown, SpreadRequest, RequestFlag,
    ).oneOf()
    all {
      spelling' = sp, method' = m, call' = c, opts' = o,
      verdict' = reports(sp, o),
    }
  }

  action init = step
}
