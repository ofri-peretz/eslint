// Model of `openai-security/no-browser-api-key-exposure`: the browser escape hatch with
// each kind of credential. The contract (rule doc): report the flag when it
// ships the app's own credential (literal, env, build-time constant, or none —
// the SDK then reads the env variable); stay silent for a per-session
// credential (a parameter, a fetched token, a provider) and for a flag that is
// off or decided at runtime.
module openai_security_no_browser_api_key_exposure {
  type Credential = NoKey | LiteralKey | EnvKey | ViteEnvKey | FallbackToEnv | ImportedKey | ParamKey | FetchedToken | ProviderFn | TokenProvider
  type Flag = TrueInline | TrueConst | FalseFlag | RuntimeFlag | NoFlag
  type Carrier = InlineOptions | OptionsConst
  type Client = SdkDefault | SdkAliased | OtherVendor

  var credential: Credential
  var flag: Flag
  var carrier: Carrier
  var client: Client
  var expected: bool

  // The app's own credential ships with the bundle; a per-session one does not.
  pure def shipped(c: Credential): bool =
    Set(NoKey, LiteralKey, EnvKey, ViteEnvKey, FallbackToEnv, ImportedKey).contains(c)

  pure def flagOn(f: Flag): bool = Set(TrueInline, TrueConst).contains(f)

  pure def shouldReport(c: Credential, f: Flag, k: Carrier, l: Client): bool =
    flagOn(f) and l != OtherVendor and shipped(c)

  action init = all {
    nondet credential0 = Set(NoKey, LiteralKey, EnvKey, ViteEnvKey, FallbackToEnv, ImportedKey, ParamKey, FetchedToken, ProviderFn, TokenProvider).oneOf()
    nondet flag0 = Set(TrueInline, TrueConst, FalseFlag, RuntimeFlag, NoFlag).oneOf()
    nondet carrier0 = Set(InlineOptions, OptionsConst).oneOf()
    nondet client0 = Set(SdkDefault, SdkAliased, OtherVendor).oneOf()
    all {
      credential' = credential0,
      flag' = flag0,
      carrier' = carrier0,
      client' = client0,
      expected' = shouldReport(credential0, flag0, carrier0, client0),
    }
  }

  action step = all {
    credential' = credential,
    flag' = flag,
    carrier' = carrier,
    client' = client,
    expected' = expected,
  }
}
