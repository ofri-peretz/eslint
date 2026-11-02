// Model of eslint-plugin-vercel-ai-security/no-hardcoded-api-keys (CWE-798).
// A provider-shaped key literal (sk-…, sk-proj-…, sk-ant-…, AIza…, with a
// digit in the body) is reported wherever it appears. A generic long secret is
// reported only under a key-ish name (apiKey, authorization, …). Env reads,
// env-variable NAMES, URLs and short or non-key strings are not.
module no_hardcoded_api_keys {
  type Loc =
    | ProviderApiKey  // createOpenAI({ apiKey: X })
    | AuthHeader      // headers: { Authorization: 'Bearer ' + X }
    | ModuleConst     // const config = X
    | ArrayElem       // const keys = [X]
  type Value =
    | OpenAIKey       // 'sk-proj-abc123xyz789def456'
    | AnthropicKey    // 'sk-ant-api03-abcdef1234567890'
    | GoogleKey       // 'AIzaSyA1234567890abcdefghijklmnopqrstuv' (39 chars, real length)
    | NotAKey         // 'sk-loading-spinner' (no digit)
    | EnvRead         // process.env.OPENAI_API_KEY
    | EnvVarName      // 'OPENAI_API_KEY_PRODUCTION'
    | GenericLong     // 'f3a9c1e7b2d84f6a9c0e1b7d3a5f8c2e'
    | UrlValue        // 'https://api.openai.com/v1/chat/completions'

  pure def providerShaped(v: Value): bool = v == OpenAIKey or v == AnthropicKey or v == GoogleKey
  pure def keyishName(l: Loc): bool = l == ProviderApiKey or l == AuthHeader

  pure def reports(importsAi: bool, l: Loc, v: Value): bool =
    importsAi and (providerShaped(v) or (v == GenericLong and keyishName(l)))

  var importsAi: bool
  var loc: Loc
  var value: Value
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet l = Set(ProviderApiKey, AuthHeader, ModuleConst, ArrayElem).oneOf()
    nondet v = Set(OpenAIKey, AnthropicKey, GoogleKey, NotAKey, EnvRead, EnvVarName, GenericLong, UrlValue).oneOf()
    all { importsAi' = i, loc' = l, value' = v, verdict' = reports(i, l, v) }
  }

  action init = step
}
