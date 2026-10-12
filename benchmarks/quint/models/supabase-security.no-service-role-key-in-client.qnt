// Model of `supabase-security/no-service-role-key-in-client`: a key of some
// kind, read in some file, handed to some factory, inline or through a const.
// The contract (rule doc): a service-role key literal is always a finding; a
// service-role env read is one behind a public prefix, in a 'use client'
// module, or handed to a browser-only factory — unless the module imports
// `server-only`. The anon key and the local-development demo key are public.
module supabase_security_no_service_role_key_in_client {
  type Key = ServiceEnv | ServicePublicEnv | ServiceViteEnv | AnonPublicEnv | ServiceJwtLiteral | SecretKeyLiteral | AnonJwtLiteral | DemoServiceJwt
  type File = PlainModule | UseClient | ServerOnly
  type Factory = CreateClient | CreateBrowserClient | CreateServerClient
  type Binding = Inline | ViaConst

  var key: Key
  var file: File
  var factory: Factory
  var binding: Binding
  var expected: bool

  pure def literalSecret(k: Key): bool = Set(ServiceJwtLiteral, SecretKeyLiteral).contains(k)

  pure def shouldReport(k: Key, f: File, y: Factory, b: Binding): bool =
    if (literalSecret(k)) true
    else if (f == ServerOnly) false
    else match k {
      | ServicePublicEnv => true
      | ServiceViteEnv => true
      | ServiceEnv => f == UseClient or y == CreateBrowserClient
      | _ => false
    }

  action init = all {
    nondet key0 = Set(ServiceEnv, ServicePublicEnv, ServiceViteEnv, AnonPublicEnv, ServiceJwtLiteral, SecretKeyLiteral, AnonJwtLiteral, DemoServiceJwt).oneOf()
    nondet file0 = Set(PlainModule, UseClient, ServerOnly).oneOf()
    nondet factory0 = Set(CreateClient, CreateBrowserClient, CreateServerClient).oneOf()
    nondet binding0 = Set(Inline, ViaConst).oneOf()
    all {
      key' = key0,
      file' = file0,
      factory' = factory0,
      binding' = binding0,
      expected' = shouldReport(key0, file0, factory0, binding0),
    }
  }

  action step = all {
    key' = key,
    file' = file,
    factory' = factory,
    binding' = binding,
    expected' = expected,
  }
}
