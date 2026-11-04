// Model of eslint-plugin-supabase-security/no-service-role-key-in-client
// (CWE-200 / CWE-798). The service_role key bypasses Row Level Security, so
// it must never reach the browser bundle. In a file importing `@supabase/*`:
//   1. a service-role env var behind a public prefix (NEXT_PUBLIC_, VITE_,
//      PUBLIC_, REACT_APP_, GATSBY_, NUXT_PUBLIC_, EXPO_PUBLIC_) or from
//      SvelteKit's public env (`$env/static/public`, `$env/dynamic/public`)
//      is reported anywhere;
//   2. a service-role env var read in a `'use client'` module is reported;
//   3. a service-role env var handed (directly, through a same-file `const`,
//      or as the `supabaseKey` option) to a browser-only factory
//      (`createBrowserClient`, `createClientComponentClient`, ...) is
//      reported, whether or not the file says `'use client'`;
//   4. a working service-role key written into source (a JWT whose payload
//      says `"role":"service_role"`, or a key-shaped `sb_secret_`) is
//      reported anywhere, `server-only` modules included; the local
//      `supabase-demo` JWT, an anon JWT and a stub `sb_secret_xyz` are not.
// A module importing `server-only` is exempt from 1-3. The env var is judged
// by the property read (`process.env.X`, `process.env['X']`,
// `import.meta.env.X`), never by a local name; the anon key is fine
// everywhere, and a private SvelteKit env import on the server is fine.
module no_service_role_key_in_client {
  type Ctx = Plain | UseClient | ServerOnly
  type Factory =
    | CreateNamed | CreateRenamed | CreateRequire | CreateNamespace
    | Browser | BrowserRenamed | BrowserBracket | ServerSsr | ComponentClient | NoImport
  type Pass = Direct | ViaConst
  type Key =
    | NextPublicService | VitePublicService | PublicService | ReactAppService
    | GatsbyService | NuxtPublicService | ExpoPublicService
    | ServerService | ServerServiceBracket | ImportMetaServer
    | SvelteStaticPublic | SvelteDynamicPublic | SveltePrivate
    | AnonPublic | JwtService | JwtAnon | JwtDemo | SbSecret | SbSecretStub

  pure def publicService(k: Key): bool = Set(
    NextPublicService, VitePublicService, PublicService, ReactAppService,
    GatsbyService, NuxtPublicService, ExpoPublicService,
    SvelteStaticPublic, SvelteDynamicPublic,
  ).contains(k)
  pure def privateService(k: Key): bool =
    Set(ServerService, ServerServiceBracket, ImportMetaServer).contains(k)
  pure def literalService(k: Key): bool = Set(JwtService, SbSecret).contains(k)
  pure def browserFactory(f: Factory): bool =
    Set(Browser, BrowserRenamed, BrowserBracket, ComponentClient).contains(f)

  pure def reports(c: Ctx, f: Factory, k: Key): bool =
    if (f == NoImport) false
    else if (literalService(k)) true
    else if (c == ServerOnly) false
    else if (publicService(k)) true
    else privateService(k) and (c == UseClient or browserFactory(f))

  // The other public prefixes are sampled on the plain factory; the private
  // SvelteKit import only on the server, where it belongs.
  pure def applies(c: Ctx, f: Factory, p: Pass, k: Key): bool =
    if (Set(VitePublicService, PublicService, ReactAppService, GatsbyService,
            NuxtPublicService, ExpoPublicService).contains(k))
      f == CreateNamed and p == Direct
    else if (k == SveltePrivate) c == Plain
    else true

  var ctx: Ctx
  var factory: Factory
  var pass: Pass
  var key: Key
  var verdict: bool

  action step = {
    nondet c = Set(Plain, UseClient, ServerOnly).oneOf()
    nondet f = Set(
      CreateNamed, CreateRenamed, CreateRequire, CreateNamespace,
      Browser, BrowserRenamed, BrowserBracket, ServerSsr, ComponentClient,
      NoImport,
    ).oneOf()
    nondet p = Set(Direct, ViaConst).oneOf()
    nondet k = Set(
      NextPublicService, VitePublicService, PublicService, ReactAppService,
      GatsbyService, NuxtPublicService, ExpoPublicService,
      ServerService, ServerServiceBracket, ImportMetaServer,
      SvelteStaticPublic, SvelteDynamicPublic, SveltePrivate,
      AnonPublic, JwtService, JwtAnon, JwtDemo, SbSecret, SbSecretStub,
    ).filter(x => applies(c, f, p, x)).oneOf()
    all {
      ctx' = c, factory' = f, pass' = p, key' = k,
      verdict' = reports(c, f, k),
    }
  }

  action init = step
}
