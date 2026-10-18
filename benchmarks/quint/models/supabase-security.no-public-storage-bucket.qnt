// Model of `supabase-security/no-public-storage-bucket`: the `public` flag of
// a bucket's options, how the options are carried, and the method. The
// contract (rule doc): `public: true` (inline or through a const) is a
// finding; as at runtime the last write wins, so a spread after it that this
// file cannot read is no evidence either way.
module supabase_security_no_public_storage_bucket {
  type Method = CreateBucket | UpdateBucket
  type Flag = TrueInline | TrueConst | FalseFlag | RuntimeFlag | NoFlag
  type Carrier = InlineOptions | OptionsConst | SpreadOfConst | UnknownSpreadAfter

  var method: Method
  var flag: Flag
  var carrier: Carrier
  var expected: bool

  pure def flagOn(f: Flag): bool = Set(TrueInline, TrueConst).contains(f)

  pure def shouldReport(m: Method, f: Flag, c: Carrier): bool =
    flagOn(f) and c != UnknownSpreadAfter

  action init = all {
    nondet method0 = Set(CreateBucket, UpdateBucket).oneOf()
    nondet flag0 = Set(TrueInline, TrueConst, FalseFlag, RuntimeFlag, NoFlag).oneOf()
    nondet carrier0 = Set(InlineOptions, OptionsConst, SpreadOfConst, UnknownSpreadAfter).oneOf()
    all {
      method' = method0,
      flag' = flag0,
      carrier' = carrier0,
      expected' = shouldReport(method0, flag0, carrier0),
    }
  }

  action step = all {
    method' = method,
    flag' = flag,
    carrier' = carrier,
    expected' = expected,
  }
}
