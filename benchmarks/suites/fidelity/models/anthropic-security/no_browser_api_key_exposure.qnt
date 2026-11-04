// Model of eslint-plugin-anthropic-security/no-browser-api-key-exposure (CWE-522).
// `dangerouslyAllowBrowser: true` on an @anthropic-ai client ships the app's
// own credential to every visitor. The flag is reported when it is `true`
// inline, through a const, or inside an options object held in a const; an
// explicit `false`, a runtime-decided value, an absent flag and a flag only a
// parameter spread could carry are not. With the flag on, the app's
// credential ships when the key is a literal, an env read (VITE_ /
// NEXT_PUBLIC_ inlined into the bundle, or a server env var), an imported or
// build-time-defined constant, `authToken` from env, or absent (the SDK falls
// back to the env var), and when a visitor's key falls back to the app's
// (`userKey || import.meta.env.VITE_...`). It does not when the browser
// obtains the credential per session: a key-provider function, a parameter
// (bring-your-own-key), or the result of an `await` or a call. Only a client
// bound to the SDK counts: every import / require spelling and a subclass;
// another vendor's client with the same flag in the same file, and a file
// with no SDK import, are not judged.
module no_browser_api_key_exposure {
  type Part = Flags | Keys | Gates
  type Flag =
    | True | False | Runtime | ConstTrue | Absent | OptionsConst | SpreadParam
  type Key =
    | Literal | ViteEnv | NextPublicEnv | ServerEnv | Imported | BuildDefine
    | NoKey | ProviderFn | Param | Await | Call | MixtureOr | AuthTokenEnv
  type Spelling =
    | Default | Named | Renamed | Namespace | Require | RequireMember
    | Subclass | OtherVendor | NoImport

  pure def flagOn(f: Flag): bool = f == True or f == ConstTrue or f == OptionsConst
  pure def appCredential(k: Key): bool = match k {
    | ProviderFn => false
    | Param => false
    | Await => false
    | Call => false
    | _ => true
  }
  pure def sdkClient(s: Spelling): bool = s != OtherVendor and s != NoImport

  pure def reports(f: Flag, k: Key, s: Spelling): bool =
    flagOn(f) and appCredential(k) and sdkClient(s)

  var part: Part
  var flag: Flag
  var key: Key
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet pt = Set(Flags, Keys, Gates).oneOf()
    nondet f = (if (pt == Flags) Set(
      True, False, Runtime, ConstTrue, Absent, OptionsConst, SpreadParam,
    ) else if (pt == Keys) Set(True) else Set(True, False)).oneOf()
    nondet k = (if (pt == Keys) Set(
      Literal, ViteEnv, NextPublicEnv, ServerEnv, Imported, BuildDefine, NoKey,
      ProviderFn, Param, Await, Call, MixtureOr, AuthTokenEnv,
    ) else Set(ViteEnv)).oneOf()
    nondet s = (if (pt == Gates) Set(
      Default, Named, Renamed, Namespace, Require, RequireMember, Subclass,
      OtherVendor, NoImport,
    ) else Set(Default)).oneOf()
    all {
      part' = pt,
      flag' = f,
      key' = k,
      spelling' = s,
      verdict' = reports(f, k, s),
    }
  }

  action init = step
}
