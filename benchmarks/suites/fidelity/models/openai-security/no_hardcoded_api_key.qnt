// Model of eslint-plugin-openai-security/no-hardcoded-api-key (CWE-798).
// A key-shaped literal (>= 20 chars, letters and digits, no whitespace) in a
// credential option of an OpenAI client is a committed secret: apiKey,
// adminAPIKey and webhookSecret, on `openai` (OpenAI, AzureOpenAI) and the
// Agents SDK's OpenAIProvider, plus the positional setDefaultOpenAIKey(key).
// organization and baseURL are not credentials. The literal is reported when
// written inline, as an env fallback (?? / || / a ternary branch), in a
// const, in a const options object, as shorthand or through a same-file
// spread. Stand-ins (placeholder, the SDK's own 'My API Key', x-fill, short,
// no digits, spaced), env reads, parameters, imports and a spread of a
// parameter are not keys. The client must be the SDK's: every import /
// require spelling, a subclass, a pass-through factory and withOptions();
// `openai-edge`, another vendor's client in the same file, or a file with no
// SDK import is not judged.
module no_hardcoded_api_key {
  type Part = Values | Props | Gates
  type Value =
    | KeyLiteral | Placeholder | StandIn | XFill | Short | NoDigits | Spaced
    | Env | EnvNullish | EnvOr | Ternary | ConstKey | ConstOptions | Shorthand
    | Spread | Param | Imported | UnseenSpread
  type Prop = ApiKey | AdminApiKey | WebhookSecret | Organization | BaseUrl
  type Spelling =
    | Default | Named | Renamed | Namespace | Require | RequireMember
    | Subclass | Wrapper | WithOptions | Azure | AgentsProvider | SetDefaultKey
    | Edge | Lookalike | NoImport

  pure def committed(v: Value): bool = match v {
    | KeyLiteral => true
    | EnvNullish => true
    | EnvOr => true
    | Ternary => true
    | ConstKey => true
    | ConstOptions => true
    | Shorthand => true
    | Spread => true
    | _ => false
  }
  pure def credential(p: Prop): bool = p != Organization and p != BaseUrl
  pure def sdkClient(s: Spelling): bool =
    s != Edge and s != Lookalike and s != NoImport

  pure def reports(v: Value, p: Prop, s: Spelling): bool =
    committed(v) and credential(p) and sdkClient(s)

  var part: Part
  var value: Value
  var prop: Prop
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet pt = Set(Values, Props, Gates).oneOf()
    nondet v = (if (pt == Values) Set(
      KeyLiteral, Placeholder, StandIn, XFill, Short, NoDigits, Spaced, Env,
      EnvNullish, EnvOr, Ternary, ConstKey, ConstOptions, Shorthand, Spread,
      Param, Imported, UnseenSpread,
    ) else Set(KeyLiteral, Env)).oneOf()
    nondet p = (if (pt == Props) Set(
      ApiKey, AdminApiKey, WebhookSecret, Organization, BaseUrl,
    ) else Set(ApiKey)).oneOf()
    nondet s = (if (pt == Gates) Set(
      Default, Named, Renamed, Namespace, Require, RequireMember, Subclass,
      Wrapper, WithOptions, Azure, AgentsProvider, SetDefaultKey, Edge,
      Lookalike, NoImport,
    ) else Set(Default)).oneOf()
    all {
      part' = pt,
      value' = v,
      prop' = p,
      spelling' = s,
      verdict' = reports(v, p, s),
    }
  }

  action init = step
}
