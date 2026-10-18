// Model of the client constructions `openai-security/no-hardcoded-api-key` must judge.
// One credential option, a value of some shape from some origin, handed to
// some constructor. The contract (rule doc): a literal key committed to this
// file and handed to the SDK's client is a finding; a placeholder, an
// environment read, or another vendor's / a test helper's object is not.
module openai_security_no_hardcoded_api_key {
  type Shape = VendorKey | GenericToken | Placeholder | Short | Masked
  type Origin = Literal | ViaConst | OptionsConst | SpreadConst | EnvRead | EnvFallback | Imported
  type Client = DefaultImport | AliasedImport | NamespaceImport | RequireCjs | Subclass | Wrapper | WithOptions | AzureClient | OtherVendor | TestMatcher

  var shape: Shape
  var origin: Origin
  var client: Client
  var expected: bool

  // A generated token: vendor-shaped or a 32-hex token. A word-built
  // placeholder, a short stand-in and a masked run are not credentials.
  pure def credentialShaped(s: Shape): bool =
    match s { | VendorKey => true | GenericToken => true | _ => false }

  // Does a literal written in THIS file reach the client option? An `??`
  // fallback commits its literal just as much as a bare literal does. An env
  // read carries no literal; an imported constant is committed in the file it
  // is declared in, not here.
  pure def literalHere(o: Origin): bool =
    match o { | EnvRead => false | Imported => false | _ => true }

  // The SDK's own client construction, however it is imported or wrapped.
  pure def sdkClient(c: Client): bool =
    Set(DefaultImport, AliasedImport, NamespaceImport, RequireCjs, Subclass, Wrapper, WithOptions, AzureClient).contains(c)

  pure def shouldReport(s: Shape, o: Origin, c: Client): bool =
    sdkClient(c) and literalHere(o) and credentialShaped(s)

  action init = all {
    nondet shape0 = Set(VendorKey, GenericToken, Placeholder, Short, Masked).oneOf()
    nondet origin0 = Set(Literal, ViaConst, OptionsConst, SpreadConst, EnvRead, EnvFallback, Imported).oneOf()
    nondet client0 = Set(DefaultImport, AliasedImport, NamespaceImport, RequireCjs, Subclass, Wrapper, WithOptions, AzureClient, OtherVendor, TestMatcher).oneOf()
    all {
      shape' = shape0,
      origin' = origin0,
      client' = client0,
      expected' = shouldReport(shape0, origin0, client0),
    }
  }

  action step = all {
    shape' = shape,
    origin' = origin,
    client' = client,
    expected' = expected,
  }
}
